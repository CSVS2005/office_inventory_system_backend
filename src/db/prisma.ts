import dotenv from 'dotenv';
import mysql, { Pool } from 'mysql2/promise';

dotenv.config();

type Dict = Record<string, any>;

function getPoolConfig() {
  const url = new URL(process.env.DATABASE_URL || 'mysql://root:@127.0.0.1:3306/inventory_system');
  return {
    host: url.hostname || '127.0.0.1',
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username || 'root'),
    password: decodeURIComponent(url.password || ''),
    database: decodeURIComponent(url.pathname.replace(/^\//, '') || 'inventory_system'),
    waitForConnections: true,
    connectionLimit: 10,
  };
}

const pool: Pool = mysql.createPool(getPoolConfig());

const tables: Record<string, string> = {
  user: 'app_users',
  personnel: 'personnel',
  inventory: 'inventory',
  activityLog: 'app_activity_logs',
  passwordResetCode: 'password_reset_codes',
};

function toDbValue(value: any) {
  if (value instanceof Date) {
    return value;
  }
  return value === undefined ? null : value;
}

function normalizeRow(row: Dict) {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key, value instanceof Date ? value : value])
  );
}

function appendCondition(parts: string[], params: any[], field: string, value: any, prefix = '') {
  if (value === undefined) return;
  const column = `${prefix}\`${field}\``;
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    if ('contains' in value) {
      parts.push(`${column} LIKE ?`);
      params.push(`%${value.contains}%`);
      return;
    }
    if ('gte' in value) {
      parts.push(`${column} >= ?`);
      params.push(toDbValue(value.gte));
    }
    if ('lte' in value) {
      parts.push(`${column} <= ?`);
      params.push(toDbValue(value.lte));
    }
    if ('gt' in value) {
      parts.push(`${column} > ?`);
      params.push(toDbValue(value.gt));
    }
    return;
  }
  parts.push(`${column} = ?`);
  params.push(toDbValue(value));
}

function buildWhere(where: Dict = {}, alias = '') {
  const parts: string[] = [];
  const params: any[] = [];
  const prefix = alias ? `${alias}.` : '';

  for (const [field, value] of Object.entries(where)) {
    if (field === 'OR' && Array.isArray(value)) {
      const orParts: string[] = [];
      for (const option of value) {
        const nested = buildWhere(option, alias);
        if (nested.sql) {
          orParts.push(`(${nested.sql})`);
          params.push(...nested.params);
        }
      }
      if (orParts.length) parts.push(`(${orParts.join(' OR ')})`);
      continue;
    }

    if (field === 'personnel' && value?.OR) {
      const orParts: string[] = [];
      for (const option of value.OR) {
        const nested = buildWhere(option, 'p');
        if (nested.sql) {
          orParts.push(`(${nested.sql})`);
          params.push(...nested.params);
        }
      }
      if (orParts.length) parts.push(`(${orParts.join(' OR ')})`);
      continue;
    }

    appendCondition(parts, params, field, value, prefix);
  }

  return { sql: parts.join(' AND '), params };
}

function orderSql(orderBy?: Dict) {
  if (!orderBy) return '';
  const [field, direction] = Object.entries(orderBy)[0] || [];
  if (!field) return '';
  return ` ORDER BY \`${field}\` ${String(direction).toUpperCase() === 'ASC' ? 'ASC' : 'DESC'}`;
}

function limitSql(args: Dict, params: any[]) {
  let sql = '';
  if (typeof args.take === 'number') {
    sql += ' LIMIT ?';
    params.push(args.take);
  }
  if (typeof args.skip === 'number') {
    if (!sql) {
      sql += ' LIMIT 18446744073709551615';
    }
    sql += ' OFFSET ?';
    params.push(args.skip);
  }
  return sql;
}

function selectSql(select?: Dict, alias = '') {
  if (!select) return '*';
  const prefix = alias ? `${alias}.` : '';
  const fields = Object.entries(select)
    .filter(([, enabled]) => enabled)
    .map(([field]) => `${prefix}\`${field}\``);
  return fields.length ? fields.join(', ') : '*';
}

async function queryRows<T = any>(sql: string, params: any[] = []) {
  const [rows] = await pool.query(sql, params);
  return rows as T[];
}

async function insert(table: string, data: Dict) {
  const clean = Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));
  if (!('createdAt' in clean)) clean.createdAt = new Date();
  if (!('updatedAt' in clean) && table !== 'activity_logs' && table !== 'password_reset_codes') clean.updatedAt = new Date();
  const columns = Object.keys(clean);
  const placeholders = columns.map(() => '?').join(', ');
  const params = columns.map((column) => toDbValue(clean[column]));
  const [result] = await pool.query(
    `INSERT INTO \`${table}\` (${columns.map((column) => `\`${column}\``).join(', ')}) VALUES (${placeholders})`,
    params
  );
  const id = (result as any).insertId;
  const [row] = await queryRows(`SELECT * FROM \`${table}\` WHERE id = ?`, [id]);
  return normalizeRow(row);
}

async function update(table: string, where: Dict, data: Dict) {
  const clean = Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));
  if (table !== 'activity_logs' && table !== 'password_reset_codes') clean.updatedAt = new Date();
  const sets = Object.keys(clean).map((column) => `\`${column}\` = ?`);
  const params = Object.keys(clean).map((column) => toDbValue(clean[column]));
  const built = buildWhere(where);
  await pool.query(`UPDATE \`${table}\` SET ${sets.join(', ')} WHERE ${built.sql}`, [...params, ...built.params]);
  const [row] = await queryRows(`SELECT * FROM \`${table}\` WHERE ${built.sql} LIMIT 1`, built.params);
  return normalizeRow(row);
}

function delegate(model: keyof typeof tables) {
  const table = tables[model];
  return {
    async findUnique(args: Dict) {
      const built = buildWhere(args.where || {});
      const rows = await queryRows(`SELECT * FROM \`${table}\` WHERE ${built.sql} LIMIT 1`, built.params);
      return rows[0] ? normalizeRow(rows[0]) : null;
    },
    async findFirst(args: Dict = {}) {
      const built = buildWhere(args.where || {});
      const where = built.sql ? ` WHERE ${built.sql}` : '';
      const rows = await queryRows(`SELECT * FROM \`${table}\`${where}${orderSql(args.orderBy)} LIMIT 1`, built.params);
      return rows[0] ? normalizeRow(rows[0]) : null;
    },
    async findMany(args: Dict = {}) {
      let join = '';
      let select = selectSql(args.select);
      if (model === 'inventory' && args.include?.personnel) {
        join = ' LEFT JOIN `personnel` p ON p.id = inventory.personnel_id';
        select = 'inventory.*';
      }

      const built = buildWhere(args.where || {}, model === 'inventory' && join ? 'inventory' : '');
      const where = built.sql ? ` WHERE ${built.sql}` : '';
      const params = [...built.params];
      const rows = await queryRows(`${`SELECT ${select} FROM \`${table}\`${join}${where}${orderSql(args.orderBy)}`}${limitSql(args, params)}`, params);

      if (model === 'inventory' && args.include?.personnel) {
        return Promise.all(rows.map(async (row: Dict) => {
          const [personnel] = await queryRows('SELECT * FROM `personnel` WHERE id = ?', [row.personnel_id]);
          return { ...normalizeRow(row), personnel: personnel ? normalizeRow(personnel) : null };
        }));
      }

      return rows.map(normalizeRow);
    },
    async count(args: Dict = {}) {
      const built = buildWhere(args.where || {});
      const where = built.sql ? ` WHERE ${built.sql}` : '';
      const rows = await queryRows<{ total: number }>(`SELECT COUNT(*) AS total FROM \`${table}\`${where}`, built.params);
      return Number(rows[0]?.total || 0);
    },
    async create(args: Dict) {
      return insert(table, args.data || {});
    },
    async update(args: Dict) {
      return update(table, args.where || {}, args.data || {});
    },
    async delete(args: Dict) {
      const row = await this.findUnique({ where: args.where });
      const built = buildWhere(args.where || {});
      await pool.query(`DELETE FROM \`${table}\` WHERE ${built.sql}`, built.params);
      return row;
    },
  };
}

export const prisma = {
  user: delegate('user'),
  personnel: delegate('personnel'),
  inventory: {
    ...delegate('inventory'),
    async groupBy(args: Dict) {
      const built = buildWhere(args.where || {});
      const where = built.sql ? ` WHERE ${built.sql}` : '';
      const rows = await queryRows<{ status: string; total: number }>(
        `SELECT status, COUNT(status) AS total FROM \`inventory\`${where} GROUP BY status`,
        built.params
      );
      return rows.map((row) => ({ status: row.status, _count: { status: Number(row.total) } }));
    },
  },
  activityLog: delegate('activityLog'),
  passwordResetCode: {
    ...delegate('passwordResetCode'),
    async findFirst(args: Dict = {}) {
      const built = buildWhere(args.where || {});
      const where = built.sql ? ` WHERE ${built.sql}` : '';
      const rows = await queryRows(`SELECT * FROM \`password_reset_codes\`${where}${orderSql(args.orderBy)} LIMIT 1`, built.params);
      const row = rows[0] ? normalizeRow(rows[0]) : null;
      if (row && args.include?.user) {
        const [user] = await queryRows('SELECT * FROM `app_users` WHERE id = ?', [row.user_id]);
        return { ...row, user: user ? normalizeRow(user) : null };
      }
      return row;
    },
  },
  async $connect() {
    const connection = await pool.getConnection();
    try {
      await connection.ping();
      await ensureSchema();
    } finally {
      connection.release();
    }
  },
  async $queryRaw<T = any>(..._args: any[]) {
    return queryRows<T>('SELECT 1 AS status');
  },
};

async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_users (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      full_name VARCHAR(255) NOT NULL,
      surname VARCHAR(100) NOT NULL,
      first_name VARCHAR(100) NOT NULL,
      username VARCHAR(100) NOT NULL UNIQUE,
      email VARCHAR(150) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role_name VARCHAR(32) NOT NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'active',
      created_by INT UNSIGNED NULL,
      owner_id INT UNSIGNED NOT NULL DEFAULT 0,
      createdAt DATETIME NOT NULL,
      updatedAt DATETIME NOT NULL,
      INDEX owner_id_idx (owner_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS personnel (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      surname VARCHAR(100) NOT NULL,
      first_name VARCHAR(100) NOT NULL,
      designation VARCHAR(120) NOT NULL,
      created_by INT UNSIGNED NOT NULL,
      user_id INT UNSIGNED NULL UNIQUE,
      owner_id INT UNSIGNED NOT NULL,
      createdAt DATETIME NOT NULL,
      updatedAt DATETIME NOT NULL,
      INDEX owner_id_idx (owner_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS inventory (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      personnel_id INT UNSIGNED NOT NULL,
      owner_id INT UNSIGNED NOT NULL,
      brand_model VARCHAR(255) NOT NULL,
      property_number VARCHAR(255) NULL,
      serial_number VARCHAR(255) NOT NULL,
      status VARCHAR(50) NOT NULL,
      processor VARCHAR(255) NULL,
      ram VARCHAR(255) NULL,
      hard_drive VARCHAR(255) NULL,
      graphics_card VARCHAR(255) NULL,
      network VARCHAR(255) NULL,
      optical_drive VARCHAR(255) NULL,
      display_device VARCHAR(255) NULL,
      avr_ups VARCHAR(255) NULL,
      printer VARCHAR(255) NULL,
      keyboard_mouse VARCHAR(255) NULL,
      operating_system VARCHAR(255) NULL,
      installed_software TEXT NULL,
      inventory_date DATETIME NOT NULL,
      remarks TEXT NULL,
      inventoried_by INT UNSIGNED NOT NULL,
      createdAt DATETIME NOT NULL,
      updatedAt DATETIME NOT NULL,
      INDEX owner_id_idx (owner_id),
      INDEX personnel_id_idx (personnel_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_activity_logs (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      owner_id INT UNSIGNED NOT NULL,
      full_name VARCHAR(255) NOT NULL,
      action VARCHAR(255) NOT NULL,
      details TEXT NULL,
      createdAt DATETIME NOT NULL,
      INDEX owner_id_idx (owner_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS password_reset_codes (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      user_id INT UNSIGNED NOT NULL,
      email VARCHAR(150) NOT NULL,
      code VARCHAR(20) NOT NULL,
      expires_at DATETIME NOT NULL,
      used TINYINT(1) NOT NULL DEFAULT 0,
      createdAt DATETIME NOT NULL,
      INDEX user_id_idx (user_id),
      INDEX email_idx (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8
  `);
}

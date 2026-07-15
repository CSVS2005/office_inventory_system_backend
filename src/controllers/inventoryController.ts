import { Request, Response } from 'express';
import { prisma } from '../db/prisma';
import { getPagination } from '../utils/pagination';
import { createActivityLog } from '../services/activityLogService';

function buildInventoryFilter(req: Request) {
  const ownerFilter = { owner_id: req.user!.owner_id };
  const roleFilter = req.user!.role_name === 'personnel'
    ? { personnel_id: (req.user as any).personnel_id }
    : {};

  const search = String(req.query.search || '').trim();
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;

  const filters: any = {
    ...ownerFilter,
    ...roleFilter,
  };

  if (status) {
    filters.status = status;
  }

  if (search) {
    filters.OR = [
      { brand_model: { contains: search } },
      { serial_number: { contains: search } },
      { property_number: { contains: search } },
      {
        personnel: {
          OR: [
            { first_name: { contains: search } },
            { surname: { contains: search } },
          ],
        },
      },
    ];
  }

  return filters;
}

export async function listInventory(req: Request, res: Response) {
  const { page, limit, skip } = getPagination(req.query as any);
  const filter = buildInventoryFilter(req);

  const [items, total] = await Promise.all([
    prisma.inventory.findMany({
      where: filter,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { personnel: true },
    }),
    prisma.inventory.count({ where: filter }),
  ]);

  return res.json({ items, meta: { page, limit, total } });
}

export async function createInventory(req: Request, res: Response) {
  const payload = req.body;
  const personnel = await prisma.personnel.findUnique({ where: { id: payload.personnel_id } });

  if (!personnel || personnel.owner_id !== req.user!.owner_id) {
    return res.status(400).json({ message: 'Personnel record not found in current workspace' });
  }

  if (req.user!.role_name === 'personnel' && personnel.id !== (req.user as any).personnel_id) {
    return res.status(403).json({ message: 'Personnel may only add inventory for their own profile' });
  }

  const inventory = await prisma.inventory.create({
    data: {
      ...payload,
      inventory_date: new Date(payload.inventory_date),
      owner_id: req.user!.owner_id,
      inventoried_by: req.user!.id,
    },
  });

  await createActivityLog(req.user!.owner_id, req.user!.full_name, 'Created inventory item', `Inventory ID ${inventory.id}`);

  return res.status(201).json(inventory);
}

export async function updateInventory(req: Request, res: Response) {
  const id = Number(req.params.id);
  const payload = req.body;
  const record = await prisma.inventory.findUnique({ where: { id } });

  if (!record || record.owner_id !== req.user!.owner_id) {
    return res.status(404).json({ message: 'Inventory item not found' });
  }

  if (req.user!.role_name === 'personnel' && record.personnel_id !== (req.user as any).personnel_id) {
    return res.status(403).json({ message: 'Personnel may only modify their own inventory' });
  }

  if (payload.personnel_id) {
    const personnel = await prisma.personnel.findUnique({ where: { id: payload.personnel_id } });
    if (!personnel || personnel.owner_id !== req.user!.owner_id) {
      return res.status(400).json({ message: 'Personnel record not found in current workspace' });
    }
  }

  const updated = await prisma.inventory.update({
    where: { id },
    data: {
      ...payload,
      inventory_date: payload.inventory_date ? new Date(payload.inventory_date) : undefined,
    },
  });

  await createActivityLog(req.user!.owner_id, req.user!.full_name, 'Updated inventory item', `Inventory ID ${id}`);

  return res.json(updated);
}

export async function deleteInventory(req: Request, res: Response) {
  const id = Number(req.params.id);
  const record = await prisma.inventory.findUnique({ where: { id } });

  if (!record || record.owner_id !== req.user!.owner_id) {
    return res.status(404).json({ message: 'Inventory item not found' });
  }

  if (req.user!.role_name === 'personnel' && record.personnel_id !== (req.user as any).personnel_id) {
    return res.status(403).json({ message: 'Personnel may only delete their own inventory' });
  }

  await prisma.inventory.delete({ where: { id } });
  await createActivityLog(req.user!.owner_id, req.user!.full_name, 'Deleted inventory item', `Inventory ID ${id}`);

  return res.json({ message: 'Inventory item removed' });
}

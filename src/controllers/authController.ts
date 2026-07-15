import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../db/prisma';
import { comparePassword, hashPassword } from '../utils/password';
import { signToken } from '../utils/jwt';
import { sendPasswordResetEmail } from '../services/emailService';
import { createActivityLog } from '../services/activityLogService';

export async function login(req: Request, res: Response) {
  const { username, password } = req.body;
  const user = await prisma.user.findUnique({ where: { username } });

  if (!user || user.status !== 'active') {
    return res.status(401).json({ message: 'Invalid credentials or inactive account' });
  }

  const valid = await comparePassword(password, user.password_hash);
  if (!valid) {
    await createActivityLog(user.owner_id, user.full_name, 'Failed login attempt', `Username: ${username}`);
    return res.status(401).json({ message: 'Invalid credentials or inactive account' });
  }

  const token = signToken({
    sub: user.id,
    role_name: user.role_name,
    owner_id: user.owner_id,
    status: user.status,
    full_name: user.full_name,
    email: user.email,
  });

  await createActivityLog(user.owner_id, user.full_name, 'Login success');

  return res.json({
    accessToken: token,
    user: {
      id: user.id,
      full_name: user.full_name,
      username: user.username,
      email: user.email,
      role_name: user.role_name,
      status: user.status,
      owner_id: user.owner_id,
    },
  });
}

export async function signup(req: Request, res: Response) {
  let { full_name, first_name, surname, username, email, password } = req.body;

  if ((!first_name || !surname) && full_name) {
    const parts = full_name.trim().split(/\s+/);
    first_name = parts[0] || '';
    surname = parts.slice(1).join(' ') || '';
  }
  const password_hash = await hashPassword(password);

  let createdUser;
  try {
    createdUser = await prisma.user.create({
      data: {
        full_name,
        first_name,
        surname,
        username,
        email,
        password_hash,
        role_name: 'admin',
        status: 'active',
        created_by: null,
        owner_id: 0,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const target = (error.meta as any)?.target;
      const field = Array.isArray(target) ? target.join(', ') : target;
      return res.status(409).json({
        message: `A user with the same ${field} already exists`,
      });
    }
    throw error;
  }

  const user = await prisma.user.update({
    where: { id: createdUser.id },
    data: { owner_id: createdUser.id },
  });

  await createActivityLog(user.owner_id, user.full_name, 'Workspace created and admin signed up');

  return res.status(201).json({
    user: {
      id: user.id,
      full_name: user.full_name,
      username: user.username,
      email: user.email,
      role_name: user.role_name,
      status: user.status,
    },
  });
}

function generateResetCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function forgotPassword(req: Request, res: Response) {
  const { email } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || user.status !== 'active') {
    return res.json({ message: 'If the account exists, a reset email has been sent' });
  }

  const code = generateResetCode();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  await prisma.passwordResetCode.create({
    data: {
      user_id: user.id,
      email: user.email,
      code,
      expires_at: expiresAt,
      used: false,
    },
  });

  await sendPasswordResetEmail(user.email, code);
  await createActivityLog(user.owner_id, user.full_name, 'Password reset requested');

  return res.json({ message: 'If the account exists, a reset email has been sent' });
}

export async function resetPassword(req: Request, res: Response) {
  const { email, code, new_password } = req.body;
  const resetRecord = await prisma.passwordResetCode.findFirst({
    where: {
      email,
      code,
      used: false,
      expires_at: { gt: new Date() },
    },
    include: { user: true },
  });

  if (!resetRecord || !resetRecord.user || resetRecord.user.status !== 'active') {
    return res.status(400).json({ message: 'The reset code is invalid or expired' });
  }

  const password_hash = await hashPassword(new_password);
  await prisma.user.update({ where: { id: resetRecord.user_id }, data: { password_hash } });
  await prisma.passwordResetCode.update({ where: { id: resetRecord.id }, data: { used: true } });
  await createActivityLog(resetRecord.user.owner_id, resetRecord.user.full_name, 'Password reset completed');

  return res.json({ message: 'Password has been reset successfully' });
}

export async function getProfile(req: Request, res: Response) {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  return res.json({ user });
}

import { Request, Response } from 'express';
import { prisma } from '../db/prisma';
import { hashPassword } from '../utils/password';
import { createActivityLog } from '../services/activityLogService';

export async function listUsers(req: Request, res: Response) {
  const users = await prisma.user.findMany({
    where: { owner_id: req.user!.owner_id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      full_name: true,
      first_name: true,
      surname: true,
      username: true,
      email: true,
      role_name: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return res.json(users);
}

export async function createUser(req: Request, res: Response) {
  const { full_name, first_name, surname, username, email, password, role_name, status } = req.body;

  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ username }, { email }],
      owner_id: req.user!.owner_id,
    },
  });

  if (existing) {
    return res.status(409).json({ message: 'A user with that username or email already exists' });
  }

  const password_hash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      full_name,
      first_name,
      surname,
      username,
      email,
      password_hash,
      role_name,
      status,
      owner_id: req.user!.owner_id,
      created_by: req.user!.id,
    },
  });

  await createActivityLog(req.user!.owner_id, req.user!.full_name, 'Created user', user.username);

  return res.status(201).json(user);
}

export async function updateUser(req: Request, res: Response) {
  const id = Number(req.params.id);
  const updates: any = {};

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.owner_id !== req.user!.owner_id) {
    return res.status(404).json({ message: 'User not found' });
  }

  if (req.body.full_name) updates.full_name = req.body.full_name;
  if (req.body.first_name) updates.first_name = req.body.first_name;
  if (req.body.surname) updates.surname = req.body.surname;
  if (req.body.email) updates.email = req.body.email;
  if (req.body.role_name) updates.role_name = req.body.role_name;
  if (req.body.status) updates.status = req.body.status;

  const updated = await prisma.user.update({ where: { id }, data: updates });
  await createActivityLog(req.user!.owner_id, req.user!.full_name, 'Updated user', `User ID ${id}`);

  return res.json(updated);
}

export async function deleteUser(req: Request, res: Response) {
  const id = Number(req.params.id);

  if (id === req.user!.id) {
    return res.status(400).json({ message: 'You cannot delete your own account' });
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.owner_id !== req.user!.owner_id) {
    return res.status(404).json({ message: 'User not found' });
  }

  await prisma.user.update({ where: { id }, data: { status: 'inactive' } });
  await createActivityLog(req.user!.owner_id, req.user!.full_name, 'Deactivated user', `User ID ${id}`);

  return res.json({ message: 'User has been deactivated' });
}

export async function resetUserPassword(req: Request, res: Response) {
  const id = Number(req.params.id);
  const { new_password } = req.body;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.owner_id !== req.user!.owner_id) {
    return res.status(404).json({ message: 'User not found' });
  }

  const password_hash = await hashPassword(new_password);
  await prisma.user.update({ where: { id }, data: { password_hash } });
  await createActivityLog(req.user!.owner_id, req.user!.full_name, 'Reset user password', `User ID ${id}`);

  return res.json({ message: 'Password has been reset successfully' });
}

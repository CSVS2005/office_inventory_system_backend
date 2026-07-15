import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../db/prisma';
import { createActivityLog } from '../services/activityLogService';

export async function listPersonnel(req: Request, res: Response) {
  const search = String(req.query.search || '').trim();
  const where: Prisma.PersonnelWhereInput = {
    owner_id: req.user!.owner_id,
    ...(search
      ? {
          OR: [
            { surname: { contains: search } },
            { first_name: { contains: search } },
            { designation: { contains: search } },
          ],
        }
      : {}),
  };

  const personnel = await prisma.personnel.findMany({ where, orderBy: { createdAt: 'desc' } });
  return res.json(personnel);
}

export async function createPersonnel(req: Request, res: Response) {
  const { surname, first_name, designation, user_id } = req.body;

  if (user_id) {
    const user = await prisma.user.findUnique({ where: { id: user_id } });
    if (!user || user.owner_id !== req.user!.owner_id) {
      return res.status(400).json({ message: 'Linked user not found in current workspace' });
    }
  }

  const personnel = await prisma.personnel.create({
    data: {
      surname,
      first_name,
      designation,
      user_id,
      owner_id: req.user!.owner_id,
      created_by: req.user!.id,
    },
  });

  await createActivityLog(req.user!.owner_id, req.user!.full_name, 'Created personnel', `${first_name} ${surname}`);

  return res.status(201).json(personnel);
}

export async function updatePersonnel(req: Request, res: Response) {
  const id = Number(req.params.id);
  const { surname, first_name, designation, user_id } = req.body;

  const record = await prisma.personnel.findUnique({ where: { id } });
  if (!record || record.owner_id !== req.user!.owner_id) {
    return res.status(404).json({ message: 'Personnel record not found' });
  }

  if (user_id) {
    const user = await prisma.user.findUnique({ where: { id: user_id } });
    if (!user || user.owner_id !== req.user!.owner_id) {
      return res.status(400).json({ message: 'Linked user not found in current workspace' });
    }
  }

  const updated = await prisma.personnel.update({
    where: { id },
    data: {
      surname,
      first_name,
      designation,
      user_id,
    },
  });

  await createActivityLog(req.user!.owner_id, req.user!.full_name, 'Updated personnel', `Personnel ID ${id}`);

  return res.json(updated);
}

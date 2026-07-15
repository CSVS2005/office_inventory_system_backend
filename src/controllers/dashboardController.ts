import { Request, Response } from 'express';
import { prisma } from '../db/prisma';

export async function getDashboard(req: Request, res: Response) {
  const user = req.user!;

  const baseFilter = user.role_name === 'personnel'
    ? { owner_id: user.owner_id, personnel_id: (req.user as any).personnel_id }
    : { owner_id: user.owner_id };

  const inventoryTotal = await prisma.inventory.count({ where: baseFilter });
  const recentInventory = await prisma.inventory.findMany({
    where: baseFilter,
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: { personnel: true },
  });

  const activityLogs = await prisma.activityLog.findMany({
    where: { owner_id: user.owner_id },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  const personnelTotal = user.role_name === 'personnel' ? 1 : await prisma.personnel.count({ where: { owner_id: user.owner_id } });
  const usersTotal = user.role_name === 'personnel' ? 1 : await prisma.user.count({ where: { owner_id: user.owner_id, status: 'active' } });

  return res.json({
    totals: {
      totalInventories: inventoryTotal,
      totalUsers: usersTotal,
      totalPersonnel: personnelTotal,
    },
    recentInventory,
    activityLogs,
  });
}

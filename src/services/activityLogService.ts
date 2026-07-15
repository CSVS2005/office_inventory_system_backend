import { prisma } from '../db/prisma';

export async function createActivityLog(ownerId: number, fullName: string, action: string, details?: string) {
  return prisma.activityLog.create({
    data: {
      owner_id: ownerId,
      full_name: fullName,
      action,
      details,
    },
  });
}

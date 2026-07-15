import { NextFunction, Request, Response } from 'express';
import { verifyToken } from '../utils/jwt';
import { prisma } from '../db/prisma';

export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

  if (!token) {
    return res.status(401).json({ message: 'Missing authorization token' });
  }

  try {
    const payload = verifyToken(token);
    if (payload.status !== 'active') {
      return res.status(403).json({ message: 'User account is inactive' });
    }

    req.user = {
      id: payload.sub,
      role_name: payload.role_name as any,
      owner_id: payload.owner_id,
      status: payload.status,
      full_name: payload.full_name,
      email: payload.email,
    };

    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid authorization token' });
  }
}

export function authorizeRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const role = req.user?.role_name;
    if (!role || !allowedRoles.includes(role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    return next();
  };
}

export async function loadPersonnelForUser(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role_name !== 'personnel') {
    return next();
  }

  const personnel = await prisma.personnel.findFirst({
    where: {
      user_id: req.user.id,
      owner_id: req.user.owner_id,
    },
  });

  if (!personnel) {
    return res.status(403).json({ message: 'Personnel profile not found for the current user' });
  }

  req.user = { ...req.user, personnel_id: personnel.id } as any;
  return next();
};

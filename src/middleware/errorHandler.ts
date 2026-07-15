import { NextFunction, Request, Response } from 'express';

export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
  console.error(err);
  const status = (err as any)?.status || 500;
  const message = (err as any)?.message || 'Internal server error';
  return res.status(status).json({ message });
}

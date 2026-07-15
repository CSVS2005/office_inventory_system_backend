import { NextFunction, Request, Response } from 'express';
import { ZodSchema, ZodError } from 'zod';

export function validateBody(schema: ZodSchema<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const details = (result.error as ZodError).format();
      return res.status(400).json({ message: 'Validation failed', details });
    }
    req.body = result.data;
    return next();
  };
}

export function validateQuery(schema: ZodSchema<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const details = (result.error as ZodError).format();
      return res.status(400).json({ message: 'Invalid query parameters', details });
    }
    req.query = result.data;
    return next();
  };
}

import { z } from 'zod';

export const personnelCreateSchema = z.object({
  surname: z.string().min(1),
  first_name: z.string().min(1),
  designation: z.string().min(1),
  user_id: z.number().int().positive().optional(),
});

export const personnelUpdateSchema = z.object({
  surname: z.string().min(1).optional(),
  first_name: z.string().min(1).optional(),
  designation: z.string().min(1).optional(),
  user_id: z.number().int().positive().optional(),
});

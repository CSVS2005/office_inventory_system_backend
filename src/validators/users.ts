import { z } from 'zod';

export const userCreateSchema = z.object({
  full_name: z.string().min(1),
  first_name: z.string().min(1),
  surname: z.string().min(1),
  username: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(8),
  role_name: z.enum(['admin', 'staff', 'personnel']),
  status: z.enum(['active', 'inactive']).optional().default('active'),
});

export const userUpdateSchema = z.object({
  full_name: z.string().min(1).optional(),
  first_name: z.string().min(1).optional(),
  surname: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role_name: z.enum(['admin', 'staff', 'personnel']).optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

export const resetUserPasswordSchema = z.object({
  new_password: z.string().min(8),
});

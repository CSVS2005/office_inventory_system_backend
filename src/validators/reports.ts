import { z } from 'zod';

export const reportQuerySchema = z.object({
  status: z.string().optional(),
  from: z.string().optional().refine((value) => !value || !Number.isNaN(Date.parse(value)), {
    message: 'Invalid from date',
  }),
  to: z.string().optional().refine((value) => !value || !Number.isNaN(Date.parse(value)), {
    message: 'Invalid to date',
  }),
});

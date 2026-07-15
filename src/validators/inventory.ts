import { z } from 'zod';

export const inventoryQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
  status: z.string().optional(),
});

export const inventoryCreateSchema = z.object({
  personnel_id: z.number().int().positive(),
  brand_model: z.string().min(1),
  property_number: z.string().optional().nullable(),
  serial_number: z.string().min(1),
  status: z.string().min(1),
  processor: z.string().optional().nullable(),
  ram: z.string().optional().nullable(),
  hard_drive: z.string().optional().nullable(),
  graphics_card: z.string().optional().nullable(),
  network: z.string().optional().nullable(),
  optical_drive: z.string().optional().nullable(),
  display_device: z.string().optional().nullable(),
  avr_ups: z.string().optional().nullable(),
  printer: z.string().optional().nullable(),
  keyboard_mouse: z.string().optional().nullable(),
  operating_system: z.string().optional().nullable(),
  installed_software: z.string().optional().nullable(),
  inventory_date: z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
    message: 'Invalid inventory date',
  }),
  remarks: z.string().optional().nullable(),
});

export const inventoryUpdateSchema = inventoryCreateSchema.partial();

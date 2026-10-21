import { z } from 'zod';
import { moneySchema, optionalText, quantitySchema } from '../../shared/schemas.ts';

export const productSchema = z.object({
  sku: z.string().trim().min(1).max(50), name: z.string().trim().min(2).max(160), description: optionalText(1000),
  categoryId: z.uuid().optional().nullable(), unitId: z.uuid(), type: z.enum(['product', 'service']).default('product'),
  salePrice: moneySchema, costPrice: moneySchema.default(0), minStock: z.coerce.number().min(0).max(999999999).default(0), active: z.boolean().default(true),
});
export const customerSchema = z.object({
  document: optionalText(40), name: z.string().trim().min(2).max(160), phone: optionalText(30), email: z.union([z.email(), z.literal('')]).optional().nullable().transform((v) => v || null), address: optionalText(500), active: z.boolean().default(true),
});
export const unitSchema = z.object({ name: z.string().trim().min(1).max(80), symbol: z.string().trim().min(1).max(12) });
export const categorySchema = z.object({ name: z.string().trim().min(1).max(100) });
export const warehouseSchema = z.object({ name: z.string().trim().min(2).max(120), code: z.string().trim().min(1).max(20).transform((v) => v.toUpperCase()), active: z.boolean().default(true) });
export const adjustmentSchema = z.object({ warehouseId: z.uuid(), productId: z.uuid(), quantity: quantitySchema, direction: z.enum(['in', 'out']), reason: z.string().trim().min(3).max(200) });

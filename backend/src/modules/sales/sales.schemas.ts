import { z } from 'zod';
import { moneySchema, optionalText, quantitySchema } from '../../shared/schemas.ts';
export const saleSchema = z.object({
  customerId: z.uuid().optional().nullable(), warehouseId: z.uuid(), soldAt: z.coerce.date().optional(), discount: moneySchema.default(0), notes: optionalText(1000),
  items: z.array(z.object({ productId: z.uuid(), quantity: quantitySchema, unitPrice: moneySchema, discount: moneySchema.default(0) })).min(1).max(100),
  payment: z.object({ amount: moneySchema, method: z.enum(['cash', 'transfer', 'card', 'credit', 'other']), reference: optionalText(100) }).optional(),
}).superRefine((v, ctx) => { const ids = v.items.map((i) => i.productId); if (new Set(ids).size !== ids.length) ctx.addIssue({ code: 'custom', path: ['items'], message: 'No repita productos; agrupe las cantidades' }); });
export const paymentSchema = z.object({ amount: moneySchema.refine((n) => n > 0, 'Debe ser mayor a cero'), method: z.enum(['cash', 'transfer', 'card', 'credit', 'other']), reference: optionalText(100) });

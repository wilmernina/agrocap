import { z } from 'zod';

export const idSchema = z.uuid();
export const paginationSchema = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20), search: z.string().trim().max(100).default('') });
export const moneySchema = z.coerce.number().min(0).max(999999999).refine((n) => Math.round(n * 100) === n * 100, 'Máximo 2 decimales');
export const quantitySchema = z.coerce.number().positive().max(999999999).refine((n) => Math.round(n * 1000) === n * 1000, 'Máximo 3 decimales');
export const wholeQuantitySchema = z.coerce.number().int('La cantidad debe ser un número entero').positive('La cantidad debe ser mayor que cero').max(999999999);
export const optionalText = (max: number) => z.string().trim().max(max).optional().nullable().transform((v) => v || null);

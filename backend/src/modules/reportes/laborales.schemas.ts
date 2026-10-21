import { z } from 'zod';

export const consultaGestionMesSchema = z.object({
  gestion: z.coerce.number().int().min(2000).max(2200),
  mes: z.coerce.number().int().min(1).max(12).optional(),
});

export const consultaCostosPersonalSchema = z.object({
  desde: z.iso.date().optional(),
  hasta: z.iso.date().optional(),
}).refine(v => !v.desde || !v.hasta || v.desde <= v.hasta, { path: ['hasta'], message: 'La fecha final debe ser igual o posterior a la inicial' });

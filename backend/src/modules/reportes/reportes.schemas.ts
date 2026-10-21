import { z } from 'zod';

const fechaInicialSchema = z.preprocess((valor) =>
  typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor)
    ? `${valor}T00:00:00.000-04:00`
    : valor, z.coerce.date());
const fechaFinalSchema = z.preprocess((valor) =>
  typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor)
    ? `${valor}T23:59:59.999-04:00`
    : valor, z.coerce.date());

export const periodoSchema = z.object({
  desde: fechaInicialSchema,
  hasta: fechaFinalSchema,
}).refine((valor) => valor.hasta >= valor.desde, { path: ['hasta'], message: 'La fecha final debe ser posterior a la inicial' });

export const topProductosSchema = z.object({
  desde: fechaInicialSchema.optional(),
  hasta: fechaFinalSchema.optional(),
  limite: z.coerce.number().int().min(1).max(100).default(10),
});

export const kardexSchema = z.object({
  desde: fechaInicialSchema.optional(),
  hasta: fechaFinalSchema.optional(),
  almacenId: z.uuid().optional(),
});

export const filtrosCampoSchema = z.object({
  desde: fechaInicialSchema.optional(),
  hasta: fechaFinalSchema.optional(),
  fincaId: z.uuid().optional(),
}).refine((valor) => !valor.desde || !valor.hasta || valor.hasta >= valor.desde, { path: ['hasta'], message: 'La fecha final debe ser posterior a la inicial' });
export const filtroFincaSchema = z.object({ fincaId: z.uuid().optional() });

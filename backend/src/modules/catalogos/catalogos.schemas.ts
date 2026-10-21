import { z } from 'zod';

export const categoriaSchema = z.object({
  nombre: z.string().trim().min(2).max(100),
  descripcion: z.string().trim().max(1000).optional().nullable().transform((valor) => valor || null),
  activo: z.boolean().default(true),
});
export const actualizarCategoriaSchema = categoriaSchema.partial().refine((datos) => Object.keys(datos).length > 0, 'Debe enviar al menos un campo');

export const unidadSchema = z.object({
  nombre: z.string().trim().min(1).max(80),
  abreviatura: z.string().trim().min(1).max(12).transform((valor) => valor.toLowerCase()),
  activo: z.boolean().default(true),
});
export const actualizarUnidadSchema = unidadSchema.partial().refine((datos) => Object.keys(datos).length > 0, 'Debe enviar al menos un campo');

export type CategoriaInput = z.infer<typeof categoriaSchema>;
export type ActualizarCategoriaInput = z.infer<typeof actualizarCategoriaSchema>;
export type UnidadInput = z.infer<typeof unidadSchema>;
export type ActualizarUnidadInput = z.infer<typeof actualizarUnidadSchema>;

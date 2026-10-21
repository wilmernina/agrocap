import { z } from 'zod';

export const almacenSchema = z.object({
  codigo: z.string().trim().min(2, 'Ingresa un código').max(20).transform((value) => value.toUpperCase()),
  nombre: z.string().trim().min(2, 'Ingresa el nombre').max(120),
  direccion: z.string().trim().max(1000).optional().nullable().transform((value) => value || null),
  activo: z.boolean().default(true),
});

export const actualizarAlmacenSchema = almacenSchema.partial().refine((value) => Object.keys(value).length > 0, 'Debe enviar al menos un campo');

export type AlmacenInput = z.infer<typeof almacenSchema>;
export type ActualizarAlmacenInput = z.infer<typeof actualizarAlmacenSchema>;

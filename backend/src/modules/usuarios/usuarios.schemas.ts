import { z } from 'zod';

const passwordSchema = z.string().min(8, 'Mínimo 8 caracteres').max(100)
  .regex(/[a-z]/, 'Debe incluir una minúscula')
  .regex(/[A-Z]/, 'Debe incluir una mayúscula')
  .regex(/[0-9]/, 'Debe incluir un número');

export const crearUsuarioSchema = z.object({
  nombre: z.string().trim().min(2).max(120),
  email: z.email('Correo inválido').trim().toLowerCase(),
  password: passwordSchema,
  rol: z.enum(['admin', 'vendedor', 'tecnico', 'almacenero']),
  activo: z.boolean().default(true),
});

export const actualizarUsuarioSchema = z.object({
  nombre: z.string().trim().min(2).max(120).optional(),
  email: z.email('Correo inválido').trim().toLowerCase().optional(),
  password: passwordSchema.optional(),
  rol: z.enum(['admin', 'vendedor', 'tecnico', 'almacenero']).optional(),
  activo: z.boolean().optional(),
}).refine((datos) => Object.keys(datos).length > 0, 'Debe enviar al menos un campo');

export type CrearUsuarioInput = z.infer<typeof crearUsuarioSchema>;
export type ActualizarUsuarioInput = z.infer<typeof actualizarUsuarioSchema>;

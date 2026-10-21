import { z } from 'zod';
import { moneySchema } from '../../shared/schemas.ts';

const textoOpcional = (maximo: number) => z.string().trim().max(maximo).optional().nullable().transform((valor) => valor || null);
const emailOpcional = z.union([z.email('Correo inválido'), z.literal('')]).optional().nullable().transform((valor) => valor || null);

export const clienteSchema = z.object({
  nombre: z.string().trim().min(2).max(160), nitCi: textoOpcional(40), telefono: textoOpcional(30),
  email: emailOpcional, direccion: textoOpcional(1000), tipo: z.enum(['externo', 'socio', 'interno']).default('externo'),
  limiteCredito: moneySchema.default(0), activo: z.boolean().default(true),
});
export const actualizarClienteSchema = clienteSchema.partial().refine((datos) => Object.keys(datos).length > 0, 'Debe enviar al menos un campo');

export const proveedorSchema = z.object({
  nombre: z.string().trim().min(2).max(160), nit: textoOpcional(40), telefono: textoOpcional(30),
  email: emailOpcional, direccion: textoOpcional(1000), contacto: textoOpcional(140), activo: z.boolean().default(true),
});
export const actualizarProveedorSchema = proveedorSchema.partial().refine((datos) => Object.keys(datos).length > 0, 'Debe enviar al menos un campo');

export type ClienteInput = z.infer<typeof clienteSchema>;
export type ActualizarClienteInput = z.infer<typeof actualizarClienteSchema>;
export type ProveedorInput = z.infer<typeof proveedorSchema>;
export type ActualizarProveedorInput = z.infer<typeof actualizarProveedorSchema>;

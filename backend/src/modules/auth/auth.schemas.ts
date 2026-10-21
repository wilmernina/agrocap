import { z } from 'zod';
export const loginSchema = z.object({
  email: z.email('Ingrese un correo válido').trim().toLowerCase(),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').max(100),
});

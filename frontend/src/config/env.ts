import { z } from 'zod';

const envSchema = z.object({
  VITE_API_URL: z.string().refine(
    (valor) => valor.startsWith('/') || URL.canParse(valor),
    'VITE_API_URL debe ser una URL válida o una ruta absoluta como /api/v1',
  ).default('http://localhost:4000/api/v1'),
});

const resultado = envSchema.safeParse(import.meta.env);

if (!resultado.success) {
  throw new Error(`Configuración del frontend inválida: ${resultado.error.issues.map((issue) => issue.message).join(', ')}`);
}

export const env = resultado.data;

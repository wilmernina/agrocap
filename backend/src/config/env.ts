import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ path: new URL('../../../.env', import.meta.url) });

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),
  CORS_ORIGIN: z.string().min(1).default('http://localhost:5173,http://127.0.0.1:5173'),
  UPLOADS_DIR: z.string().min(1).default('uploads'),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Variables de entorno inválidas', z.flattenError(parsed.error).fieldErrors);
  process.exit(1);
}
export const env = parsed.data;

import { defineConfig } from 'drizzle-kit';
import dotenv from 'dotenv';

dotenv.config({ path: new URL('../.env', import.meta.url) });

export default defineConfig({
  schema: ['./src/db/schema-fase1.ts', './src/db/schema-fase2.ts'],
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL ?? 'postgresql://agrosys:agrosys@localhost:5432/agrosys' },
  strict: true,
});

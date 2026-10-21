import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { env } from '../config/env.ts';
import * as esquemaLegado from './schema.ts';
import * as esquemaFase1 from './schema-fase1.ts';
import * as esquemaFase2 from './schema-fase2.ts';
import * as esquemaFase3 from './schema-fase3.ts';

// Ambos esquemas convivirán durante la migración incremental de las Partes 2–4.
const schema = { ...esquemaLegado, ...esquemaFase1, ...esquemaFase2, ...esquemaFase3 };

const pool = new pg.Pool({ connectionString: env.DATABASE_URL, max: 10 });
export const db = drizzle(pool, { schema });
export type Database = typeof db;
export async function closeDatabase() { await pool.end(); }

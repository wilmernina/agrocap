import type { Response } from 'express';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db/index.ts';
import type { AuthRequest } from '../../shared/types.ts';
import { marcarAsistenciaSchema } from '../personal/asistencias.schemas.ts';
import { AsistenciasService } from '../personal/asistencias.service.ts';
import { tareoSchema } from '../personal/tareos.schemas.ts';
import { TareosService } from '../personal/tareos.service.ts';

const operaciones = z.discriminatedUnion('tipo', [
  z.object({ id: z.uuid(), tipo: z.literal('asistencia'), payload: z.unknown() }),
  z.object({ id: z.uuid(), tipo: z.literal('tareo'), payload: z.unknown() }),
]);
const lote = z.object({ operaciones: z.array(operaciones).min(1).max(50) });
const asistencias = new AsistenciasService(), tareos = new TareosService();
const ctx = (req: AuthRequest) => ({ organizacionId: req.user!.organizationId, usuarioId: req.user!.id, ip: req.ip });

type Resultado = { procesado: boolean; repetido?: boolean; resultado?: unknown; error?: string };
async function ejecutar(req: AuthRequest, id: string, tipo: string, accion: () => Promise<unknown>) {
  const org = req.user!.organizationId;
  const previo = await db.execute(sql`SELECT respuesta FROM registros_sync WHERE organizacion_id=${org} AND cliente_id=${id} LIMIT 1`) as unknown as { rows: Array<{ respuesta: unknown }> };
  if (previo.rows[0]) return { resultado: previo.rows[0].respuesta, repetido: true };
  const resultado = await accion();
  try {
    await db.execute(sql`INSERT INTO registros_sync (organizacion_id, cliente_id, tipo, respuesta) VALUES (${org}, ${id}, ${tipo}, ${JSON.stringify(resultado)}::jsonb)`);
  } catch (error) {
    if ((error as { code?: string }).code !== '23505') throw error;
    const reintento = await db.execute(sql`SELECT respuesta FROM registros_sync WHERE organizacion_id=${org} AND cliente_id=${id} LIMIT 1`) as unknown as { rows: Array<{ respuesta: unknown }> };
    if (reintento.rows[0]) return { resultado: reintento.rows[0].respuesta, repetido: true };
    throw error;
  }
  return { resultado, repetido: false };
}

export async function sincronizarLote(req: AuthRequest, res: Response) {
  const datos = lote.parse(req.body), resultados: Array<Resultado & { id: string }> = [];
  for (const op of datos.operaciones) {
    try {
      const guardado = await ejecutar(req, op.id, op.tipo, async () => {
        if (op.tipo === 'asistencia') return asistencias.marcar(req.user!.organizationId, marcarAsistenciaSchema.parse(op.payload), ctx(req));
        return tareos.crear(tareoSchema.parse(op.payload), ctx(req));
      });
      resultados.push({ id: op.id, procesado: true, ...guardado });
    } catch (error) {
      resultados.push({ id: op.id, procesado: false, error: error instanceof Error ? error.message : 'No se pudo procesar el registro' });
    }
  }
  res.json({ data: resultados });
}

export async function ejecutarConIdempotencia(req: AuthRequest, tipo: string, accion: () => Promise<unknown>) {
  const cabecera = req.get('Idempotency-Key');
  if (!cabecera || !z.uuid().safeParse(cabecera).success) return accion();
  return (await ejecutar(req, cabecera, tipo, accion)).resultado;
}

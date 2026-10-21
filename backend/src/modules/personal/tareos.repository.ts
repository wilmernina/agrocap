import { and, asc, count, desc, eq, gte, lte } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import { parcelas } from '../../db/schema-fase2.ts';
import { empleados, tareos } from '../../db/schema-fase3.ts';
import { registrarAuditoria, type ContextoAuditoria } from '../../shared/auditoria.ts';
import { ConflictError } from '../../shared/errors.ts';
import type { ActualizarTareoInput, ConsultaTareos, TareoInput } from './tareos.schemas.ts';

export class TareosRepository {
  async listar(org: string, q: ConsultaTareos) {
    const filtro = and(eq(tareos.organizacionId, org), q.empleado ? eq(tareos.empleadoId, q.empleado) : undefined, q.parcela ? eq(tareos.parcelaId, q.parcela) : undefined, q.estado ? eq(tareos.estado, q.estado) : undefined, q.desde ? gte(tareos.fecha, q.desde) : undefined, q.hasta ? lte(tareos.fecha, q.hasta) : undefined);
    const [data, total] = await Promise.all([db.select({ tareo: tareos, empleado: empleados }).from(tareos).innerJoin(empleados, eq(empleados.id, tareos.empleadoId)).where(filtro).orderBy(desc(tareos.fecha), asc(empleados.apellidos)).limit(q.limite).offset((q.pagina - 1) * q.limite), db.select({ valor: count() }).from(tareos).where(filtro)]);
    return { data, total: total[0]?.valor ?? 0 };
  }
  async obtener(org: string, id: string) { const [row] = await db.select({ tareo: tareos, empleado: empleados }).from(tareos).innerJoin(empleados, eq(empleados.id, tareos.empleadoId)).where(and(eq(tareos.organizacionId, org), eq(tareos.id, id))).limit(1); return row; }
  async empleadoValido(org: string, id: string) { const [row] = await db.select({ id: empleados.id }).from(empleados).where(and(eq(empleados.organizacionId, org), eq(empleados.id, id))).limit(1); return Boolean(row); }
  async parcelaValida(org: string, id: string) { const [row] = await db.select({ id: parcelas.id }).from(parcelas).where(and(eq(parcelas.organizacionId, org), eq(parcelas.id, id), eq(parcelas.activo, true))).limit(1); return Boolean(row); }
  crear(datos: TareoInput & { subtotal: string }, ctx: ContextoAuditoria) { return db.transaction(async tx => { const [row] = await tx.insert(tareos).values({ ...datos, organizacionId: ctx.organizacionId }).returning(); await registrarAuditoria(tx, ctx, 'CREAR', 'tareos', row.id, null, row); return row; }); }
  actualizar(org: string, id: string, datos: ActualizarTareoInput & { subtotal?: string }, ctx: ContextoAuditoria) { return db.transaction(async tx => { const [antes] = await tx.select().from(tareos).where(and(eq(tareos.organizacionId, org), eq(tareos.id, id))).for('update'); if (!antes) return undefined; if (antes.estado !== 'pendiente') throw new ConflictError('Solo se pueden modificar tareos pendientes de aprobación'); const [row] = await tx.update(tareos).set({ ...datos, updatedAt: new Date() }).where(eq(tareos.id, id)).returning(); await registrarAuditoria(tx, ctx, 'ACTUALIZAR', 'tareos', id, antes, row); return row; }); }
  aprobar(org: string, id: string, ctx: ContextoAuditoria) { return db.transaction(async tx => { const [antes] = await tx.select().from(tareos).where(and(eq(tareos.organizacionId, org), eq(tareos.id, id))).for('update'); if (!antes) return undefined; if (antes.estado !== 'pendiente') throw new ConflictError('El tareo ya fue aprobado o pagado'); const [row] = await tx.update(tareos).set({ estado: 'aprobado', aprobadoPor: ctx.usuarioId, updatedAt: new Date() }).where(eq(tareos.id, id)).returning(); await registrarAuditoria(tx, ctx, 'ACTUALIZAR', 'tareos', id, antes, row); return row; }); }
  eliminar(org: string, id: string, ctx: ContextoAuditoria) { return db.transaction(async tx => { const [antes] = await tx.select().from(tareos).where(and(eq(tareos.organizacionId, org), eq(tareos.id, id))).for('update'); if (!antes) return undefined; if (antes.estado !== 'pendiente') throw new ConflictError('Solo se pueden eliminar tareos pendientes'); await tx.delete(tareos).where(eq(tareos.id, id)); await registrarAuditoria(tx, ctx, 'DESACTIVAR', 'tareos', id, antes, null); return antes; }); }
  pendientes(org: string) { return db.select({ tareo: tareos, empleado: empleados }).from(tareos).innerJoin(empleados, eq(empleados.id, tareos.empleadoId)).where(and(eq(tareos.organizacionId, org), eq(tareos.estado, 'pendiente'))).orderBy(asc(tareos.fecha), asc(empleados.apellidos)); }
}

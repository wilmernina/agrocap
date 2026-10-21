import { and, asc, count, desc, eq, gte, ilike, lte, or, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { db } from '../../db/index.ts';
import { almacenes, productos } from '../../db/schema-fase1.ts';
import { actividadesCampo, ciclosCultivo, cultivos, monitoreoPlagas, parcelas, fotosCampo } from '../../db/schema-fase2.ts';
import { InventarioService } from '../inventario/inventario.service.ts';
import { registrarAuditoria, type ContextoAuditoria } from '../../shared/auditoria.ts';
import { AppError } from '../../shared/errors.ts';
import type {
  ActualizarActividadInput, ActualizarCicloInput, ActualizarCultivoInput, ActualizarMonitoreoInput,
  ActividadInput, CicloInput, ConsultaActividades, ConsultaCiclos, ConsultaCultivos, ConsultaMonitoreo,
  ConsultaFotos, CultivoInput, FotoCampoInput, MonitoreoInput,
} from './seguimiento.schemas.ts';

const inventario = new InventarioService();
const seleccionarCiclo = {
  id: ciclosCultivo.id, organizacionId: ciclosCultivo.organizacionId, parcelaId: ciclosCultivo.parcelaId, cultivoId: ciclosCultivo.cultivoId,
  fechaSiembra: ciclosCultivo.fechaSiembra, fechaCosechaEstimada: ciclosCultivo.fechaCosechaEstimada, fechaCosechaReal: ciclosCultivo.fechaCosechaReal,
  estado: ciclosCultivo.estado, rendimientoEstimado: ciclosCultivo.rendimientoEstimado, rendimientoReal: ciclosCultivo.rendimientoReal,
  unidadRendimiento: ciclosCultivo.unidadRendimiento, observaciones: ciclosCultivo.observaciones, createdAt: ciclosCultivo.createdAt, updatedAt: ciclosCultivo.updatedAt,
};
const seleccionarActividad = {
  id: actividadesCampo.id, organizacionId: actividadesCampo.organizacionId, cicloCultivoId: actividadesCampo.cicloCultivoId, parcelaId: actividadesCampo.parcelaId,
  tipo: actividadesCampo.tipo, fecha: actividadesCampo.fecha, descripcion: actividadesCampo.descripcion, usuarioId: actividadesCampo.usuarioId,
  costoTotal: actividadesCampo.costoTotal, productoId: actividadesCampo.productoId, cantidadProducto: actividadesCampo.cantidadProducto,
  almacenId: actividadesCampo.almacenId, costoProductoUnitario: actividadesCampo.costoProductoUnitario, clima: actividadesCampo.clima,
  createdAt: actividadesCampo.createdAt, updatedAt: actividadesCampo.updatedAt,
};
const seleccionarMonitoreo = {
  id: monitoreoPlagas.id, organizacionId: monitoreoPlagas.organizacionId, cicloCultivoId: monitoreoPlagas.cicloCultivoId, parcelaId: monitoreoPlagas.parcelaId,
  fecha: monitoreoPlagas.fecha, plagaEnfermedad: monitoreoPlagas.plagaEnfermedad, severidad: monitoreoPlagas.severidad,
  incidenciaPorcentaje: monitoreoPlagas.incidenciaPorcentaje, accionTomada: monitoreoPlagas.accionTomada, productoAplicado: monitoreoPlagas.productoAplicado,
  usuarioId: monitoreoPlagas.usuarioId, observaciones: monitoreoPlagas.observaciones, createdAt: monitoreoPlagas.createdAt, updatedAt: monitoreoPlagas.updatedAt,
};

export class SeguimientoRepository {
  async listarCultivos(org: string, q: ConsultaCultivos) {
    const filtro = and(eq(cultivos.organizacionId, org), q.activo === undefined ? undefined : eq(cultivos.activo, q.activo), q.tipo ? eq(cultivos.tipo, q.tipo) : undefined,
      q.busqueda ? or(ilike(cultivos.nombreComun, `%${q.busqueda}%`), ilike(cultivos.nombreCientifico, `%${q.busqueda}%`), ilike(cultivos.variedad, `%${q.busqueda}%`)) : undefined);
    const [data, total] = await Promise.all([db.select().from(cultivos).where(filtro).orderBy(asc(cultivos.nombreComun)).limit(q.limite).offset((q.pagina - 1) * q.limite), db.select({ valor: count() }).from(cultivos).where(filtro)]);
    return { data, total: total[0]?.valor ?? 0 };
  }
  async obtenerCultivo(org: string, id: string) { const [row] = await db.select().from(cultivos).where(and(eq(cultivos.organizacionId, org), eq(cultivos.id, id))).limit(1); return row; }
  crearCultivo(datos: CultivoInput, ctx: ContextoAuditoria) { return db.transaction(async (tx) => { const [row] = await tx.insert(cultivos).values({ ...datos, organizacionId: ctx.organizacionId }).returning(); await registrarAuditoria(tx, ctx, 'CREAR', 'cultivos', row.id, null, row); return row; }); }
  actualizarCultivo(id: string, datos: ActualizarCultivoInput, ctx: ContextoAuditoria) { return db.transaction(async (tx) => { const [antes] = await tx.select().from(cultivos).where(and(eq(cultivos.id, id), eq(cultivos.organizacionId, ctx.organizacionId))).for('update'); if (!antes) return undefined; const [row] = await tx.update(cultivos).set({ ...datos, updatedAt: new Date() }).where(eq(cultivos.id, id)).returning(); await registrarAuditoria(tx, ctx, 'ACTUALIZAR', 'cultivos', id, antes, row); return row; }); }
  desactivarCultivo(id: string, ctx: ContextoAuditoria) { return db.transaction(async (tx) => { const [antes] = await tx.select().from(cultivos).where(and(eq(cultivos.id, id), eq(cultivos.organizacionId, ctx.organizacionId))).for('update'); if (!antes) return undefined; const [row] = await tx.update(cultivos).set({ activo: false, updatedAt: new Date() }).where(eq(cultivos.id, id)).returning(); await registrarAuditoria(tx, ctx, 'DESACTIVAR', 'cultivos', id, antes, row); return row; }); }
  async ciclosDeCultivo(org: string, cultivoId: string) { return db.select({ id: ciclosCultivo.id, parcelaId: ciclosCultivo.parcelaId, parcela: parcelas.nombre, fechaSiembra: ciclosCultivo.fechaSiembra, fechaCosechaEstimada: ciclosCultivo.fechaCosechaEstimada, fechaCosechaReal: ciclosCultivo.fechaCosechaReal, estado: ciclosCultivo.estado, rendimientoReal: ciclosCultivo.rendimientoReal }).from(ciclosCultivo).innerJoin(parcelas, eq(ciclosCultivo.parcelaId, parcelas.id)).where(and(eq(ciclosCultivo.organizacionId, org), eq(ciclosCultivo.cultivoId, cultivoId), eq(parcelas.organizacionId, org))).orderBy(desc(ciclosCultivo.fechaSiembra)); }

  private async validarReferencias(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], org: string, parcelaId: string, cultivoId?: string | null) {
    const [parcela] = await tx.select({ id: parcelas.id }).from(parcelas).where(and(eq(parcelas.id, parcelaId), eq(parcelas.organizacionId, org), eq(parcelas.activo, true))).limit(1);
    if (!parcela) throw new AppError(422, 'La parcela no existe o está inactiva', 'PARCELA_INVALIDA');
    if (cultivoId) { const [cultivo] = await tx.select({ id: cultivos.id }).from(cultivos).where(and(eq(cultivos.id, cultivoId), eq(cultivos.organizacionId, org), eq(cultivos.activo, true))).limit(1); if (!cultivo) throw new AppError(422, 'El cultivo no existe o está inactivo', 'CULTIVO_INVALIDO'); }
  }
  async listarCiclos(org: string, q: ConsultaCiclos) {
    const filtro = and(eq(ciclosCultivo.organizacionId, org), q.parcela ? eq(ciclosCultivo.parcelaId, q.parcela) : undefined, q.cultivo ? eq(ciclosCultivo.cultivoId, q.cultivo) : undefined, q.estado ? eq(ciclosCultivo.estado, q.estado) : undefined);
    const [data, total] = await Promise.all([
      db.select({ ...seleccionarCiclo, parcela: parcelas.nombre, cultivo: cultivos.nombreComun, variedad: cultivos.variedad }).from(ciclosCultivo).innerJoin(parcelas, eq(ciclosCultivo.parcelaId, parcelas.id)).innerJoin(cultivos, eq(ciclosCultivo.cultivoId, cultivos.id)).where(filtro).orderBy(desc(ciclosCultivo.fechaSiembra)).limit(q.limite).offset((q.pagina - 1) * q.limite),
      db.select({ valor: count() }).from(ciclosCultivo).where(filtro),
    ]); return { data, total: total[0]?.valor ?? 0 };
  }
  async ciclosActivos(org: string) { return db.select({ ...seleccionarCiclo, parcela: parcelas.nombre, cultivo: cultivos.nombreComun, variedad: cultivos.variedad }).from(ciclosCultivo).innerJoin(parcelas, eq(ciclosCultivo.parcelaId, parcelas.id)).innerJoin(cultivos, eq(ciclosCultivo.cultivoId, cultivos.id)).where(and(eq(ciclosCultivo.organizacionId, org), eq(ciclosCultivo.estado, 'en_curso'))).orderBy(desc(ciclosCultivo.fechaSiembra)); }
  async obtenerCiclo(org: string, id: string) { const [row] = await db.select().from(ciclosCultivo).where(and(eq(ciclosCultivo.id, id), eq(ciclosCultivo.organizacionId, org))).limit(1); return row; }
  crearCiclo(datos: CicloInput, ctx: ContextoAuditoria) { return db.transaction(async (tx) => { await this.validarReferencias(tx, ctx.organizacionId, datos.parcelaId, datos.cultivoId); const [row] = await tx.insert(ciclosCultivo).values({ ...datos, rendimientoEstimado: datos.rendimientoEstimado == null ? null : datos.rendimientoEstimado.toFixed(3), organizacionId: ctx.organizacionId }).returning(); await registrarAuditoria(tx, ctx, 'CREAR', 'ciclos_cultivo', row.id, null, row); return row; }); }
  actualizarCiclo(id: string, datos: ActualizarCicloInput, ctx: ContextoAuditoria) { return db.transaction(async (tx) => { const [antes] = await tx.select().from(ciclosCultivo).where(and(eq(ciclosCultivo.id, id), eq(ciclosCultivo.organizacionId, ctx.organizacionId))).for('update'); if (!antes) return undefined; if (datos.parcelaId || datos.cultivoId) await this.validarReferencias(tx, ctx.organizacionId, datos.parcelaId ?? antes.parcelaId, datos.cultivoId ?? antes.cultivoId); const [row] = await tx.update(ciclosCultivo).set({ ...datos, rendimientoEstimado: datos.rendimientoEstimado == null ? datos.rendimientoEstimado : datos.rendimientoEstimado.toFixed(3), updatedAt: new Date() }).where(eq(ciclosCultivo.id, id)).returning(); await registrarAuditoria(tx, ctx, 'ACTUALIZAR', 'ciclos_cultivo', id, antes, row); return row; }); }
  desactivarCiclo(id: string, ctx: ContextoAuditoria) { return db.transaction(async (tx) => { const [antes] = await tx.select().from(ciclosCultivo).where(and(eq(ciclosCultivo.id, id), eq(ciclosCultivo.organizacionId, ctx.organizacionId))).for('update'); if (!antes) return undefined; const [row] = await tx.update(ciclosCultivo).set({ estado: 'perdido', updatedAt: new Date() }).where(eq(ciclosCultivo.id, id)).returning(); await registrarAuditoria(tx, ctx, 'DESACTIVAR', 'ciclos_cultivo', id, antes, row); return row; }); }
  cosecharCiclo(id: string, rendimientoReal: number, fechaCosechaReal: string | undefined, observaciones: string | null | undefined, ctx: ContextoAuditoria) { return db.transaction(async (tx) => { const [antes] = await tx.select().from(ciclosCultivo).where(and(eq(ciclosCultivo.id, id), eq(ciclosCultivo.organizacionId, ctx.organizacionId))).for('update'); if (!antes) return undefined; if (antes.estado === 'cosechado') throw new AppError(409, 'Este ciclo ya fue cosechado', 'CICLO_YA_COSECHADO'); const [row] = await tx.update(ciclosCultivo).set({ estado: 'cosechado', rendimientoReal: rendimientoReal.toFixed(3), fechaCosechaReal: fechaCosechaReal ?? new Date().toISOString().slice(0, 10), observaciones: observaciones ?? antes.observaciones, updatedAt: new Date() }).where(eq(ciclosCultivo.id, id)).returning(); await registrarAuditoria(tx, ctx, 'ACTUALIZAR', 'ciclos_cultivo', id, antes, row); return row; }); }

  private async almacén(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], org: string, almacenId?: string | null) {
    const [fila] = await tx.select({ id: almacenes.id }).from(almacenes).where(and(eq(almacenes.organizacionId, org), eq(almacenes.activo, true), almacenId ? eq(almacenes.id, almacenId) : undefined)).orderBy(almacenId ? asc(almacenes.codigo) : sql`CASE WHEN ${almacenes.codigo}='CENTRAL' THEN 0 ELSE 1 END`, asc(almacenes.codigo)).limit(1);
    if (!fila) throw new AppError(422, 'Indica un almacén activo para registrar el consumo', 'ALMACEN_INVALIDO'); return fila.id;
  }
  private async productoCosto(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], org: string, productoId: string) {
    const [fila] = await tx.select({ costo: productos.precioCosto }).from(productos).where(and(eq(productos.id, productoId), eq(productos.organizacionId, org), eq(productos.activo, true))).for('update');
    if (!fila) throw new AppError(422, 'El producto no existe o está inactivo', 'PRODUCTO_INVALIDO'); return Number(fila.costo);
  }
  private async validarCicloActividad(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], org: string, parcelaId: string, cicloId?: string | null) {
    const [parcela] = await tx.select({ id: parcelas.id }).from(parcelas).where(and(eq(parcelas.id, parcelaId), eq(parcelas.organizacionId, org), eq(parcelas.activo, true))).limit(1);
    if (!parcela) throw new AppError(422, 'La parcela no existe o está inactiva', 'PARCELA_INVALIDA');
    if (cicloId) { const [ciclo] = await tx.select({ id: ciclosCultivo.id }).from(ciclosCultivo).where(and(eq(ciclosCultivo.id, cicloId), eq(ciclosCultivo.organizacionId, org), eq(ciclosCultivo.parcelaId, parcelaId))).limit(1); if (!ciclo) throw new AppError(422, 'El ciclo no pertenece a esta parcela', 'CICLO_INVALIDO'); }
  }
  async listarActividades(org: string, q: ConsultaActividades) {
    const filtro = and(eq(actividadesCampo.organizacionId, org), q.parcela ? eq(actividadesCampo.parcelaId, q.parcela) : undefined, q.tipo ? eq(actividadesCampo.tipo, q.tipo) : undefined, q.desde ? gte(actividadesCampo.fecha, q.desde) : undefined, q.hasta ? lte(actividadesCampo.fecha, q.hasta) : undefined);
    const [data, total] = await Promise.all([
      db.select({ ...seleccionarActividad, parcela: parcelas.nombre, producto: productos.nombre, almacen: almacenes.nombre }).from(actividadesCampo).innerJoin(parcelas, eq(actividadesCampo.parcelaId, parcelas.id)).leftJoin(productos, eq(actividadesCampo.productoId, productos.id)).leftJoin(almacenes, eq(actividadesCampo.almacenId, almacenes.id)).where(filtro).orderBy(desc(actividadesCampo.fecha)).limit(q.limite).offset((q.pagina - 1) * q.limite),
      db.select({ valor: count() }).from(actividadesCampo).where(filtro),
    ]); return { data, total: total[0]?.valor ?? 0 };
  }
  async obtenerActividad(org: string, id: string) { const [row] = await db.select({ ...seleccionarActividad, parcela: parcelas.nombre, producto: productos.nombre, almacen: almacenes.nombre }).from(actividadesCampo).innerJoin(parcelas, eq(actividadesCampo.parcelaId, parcelas.id)).leftJoin(productos, eq(actividadesCampo.productoId, productos.id)).leftJoin(almacenes, eq(actividadesCampo.almacenId, almacenes.id)).where(and(eq(actividadesCampo.id, id), eq(actividadesCampo.organizacionId, org))).limit(1); return row; }
  crearActividad(datos: ActividadInput, ctx: ContextoAuditoria) { return db.transaction(async (tx) => {
    await this.validarCicloActividad(tx, ctx.organizacionId, datos.parcelaId, datos.cicloCultivoId);
    const id = randomUUID(); let almacenId: string | null = null; let costoUnitario: string | null = null;
    if (datos.productoId && datos.cantidadProducto) { almacenId = await this.almacén(tx, ctx.organizacionId, datos.almacenId); costoUnitario = (await this.productoCosto(tx, ctx.organizacionId, datos.productoId)).toFixed(2); }
    const costo = Number(datos.costoTotal) + Number(costoUnitario ?? 0) * Number(datos.cantidadProducto ?? 0);
    const [row] = await tx.insert(actividadesCampo).values({ id, organizacionId: ctx.organizacionId, cicloCultivoId: datos.cicloCultivoId, parcelaId: datos.parcelaId, tipo: datos.tipo, fecha: datos.fecha, descripcion: datos.descripcion, usuarioId: ctx.usuarioId, costoTotal: costo.toFixed(2), productoId: datos.productoId, cantidadProducto: datos.cantidadProducto?.toFixed(3) ?? null, almacenId, costoProductoUnitario: costoUnitario, clima: datos.clima }).returning();
    if (datos.productoId && datos.cantidadProducto && almacenId) await inventario.registrarSalida(tx, ctx, { productoId: datos.productoId, almacenId, cantidad: datos.cantidadProducto, referenciaId: id, parcelaId: datos.parcelaId, motivo: `Actividad de campo: ${datos.descripcion}` });
    await registrarAuditoria(tx, ctx, 'CREAR', 'actividades_campo', id, null, row); return row;
  }); }
  actualizarActividad(id: string, datos: ActualizarActividadInput, ctx: ContextoAuditoria) { return db.transaction(async (tx) => {
    const [antes] = await tx.select().from(actividadesCampo).where(and(eq(actividadesCampo.id, id), eq(actividadesCampo.organizacionId, ctx.organizacionId))).for('update'); if (!antes) return undefined;
    const result = { ...antes, ...datos };
    await this.validarCicloActividad(tx, ctx.organizacionId, result.parcelaId, result.cicloCultivoId);
    const consumoAnterior = antes.productoId && antes.cantidadProducto && antes.almacenId ? { productoId: antes.productoId, almacenId: antes.almacenId, cantidad: Number(antes.cantidadProducto) } : null;
    const consumeNuevo = Boolean(result.productoId && result.cantidadProducto);
    if (Boolean(result.productoId) !== Boolean(result.cantidadProducto)) throw new AppError(422, 'Producto y cantidad deben quedar definidos juntos', 'CONSUMO_INCOMPLETO');
    let almacenId: string | null = consumeNuevo ? await this.almacén(tx, ctx.organizacionId, result.almacenId ?? antes.almacenId) : null;
    let costoUnitario: string | null = consumeNuevo ? (consumoAnterior && result.productoId === antes.productoId ? Number(antes.costoProductoUnitario).toFixed(2) : (await this.productoCosto(tx, ctx.organizacionId, result.productoId!)).toFixed(2)) : null;
    const cambioConsumo = consumoAnterior?.productoId !== (consumeNuevo ? result.productoId : null) || consumoAnterior?.almacenId !== almacenId || Number(consumoAnterior?.cantidad ?? 0) !== Number(result.cantidadProducto ?? 0) || antes.parcelaId !== result.parcelaId;
    if (cambioConsumo && consumoAnterior) await inventario.registrarEntrada(tx, ctx, { ...consumoAnterior, referenciaId: id, parcelaId: antes.parcelaId, motivo: `Reversión por edición de actividad ${id}` });
    if (cambioConsumo && consumeNuevo && result.productoId && result.cantidadProducto && almacenId) await inventario.registrarSalida(tx, ctx, { productoId: result.productoId, almacenId, cantidad: Number(result.cantidadProducto), referenciaId: id, parcelaId: result.parcelaId, motivo: `Actividad de campo: ${result.descripcion}` });
    const costoBase = datos.costoTotal !== undefined ? Number(datos.costoTotal) : Math.max(0, Number(antes.costoTotal) - Number(antes.cantidadProducto ?? 0) * Number(antes.costoProductoUnitario ?? 0));
    const total = costoBase + Number(costoUnitario ?? 0) * Number(result.cantidadProducto ?? 0);
    const { costoTotal: _costoSolicitado, cantidadProducto: _cantidadSolicitada, ...datosPersistencia } = datos;
    const [row] = await tx.update(actividadesCampo).set({ ...datosPersistencia, productoId: result.productoId, cantidadProducto: result.cantidadProducto == null ? null : Number(result.cantidadProducto).toFixed(3), almacenId, costoProductoUnitario: costoUnitario, costoTotal: total.toFixed(2), updatedAt: new Date() }).where(eq(actividadesCampo.id, id)).returning();
    await registrarAuditoria(tx, ctx, 'ACTUALIZAR', 'actividades_campo', id, antes, row); return row;
  }); }
  eliminarActividad(id: string, ctx: ContextoAuditoria) { return db.transaction(async (tx) => {
    const [antes] = await tx.select().from(actividadesCampo).where(and(eq(actividadesCampo.id, id), eq(actividadesCampo.organizacionId, ctx.organizacionId))).for('update'); if (!antes) return undefined;
    if (antes.productoId && antes.cantidadProducto && antes.almacenId) await inventario.registrarEntrada(tx, ctx, { productoId: antes.productoId, almacenId: antes.almacenId, cantidad: Number(antes.cantidadProducto), referenciaId: id, parcelaId: antes.parcelaId, motivo: `Reversión por eliminación de actividad ${id}` });
    await tx.delete(actividadesCampo).where(eq(actividadesCampo.id, id)); await registrarAuditoria(tx, ctx, 'DESACTIVAR', 'actividades_campo', id, antes, null); return { eliminado: true, id };
  }); }

  async listarMonitoreo(org: string, q: ConsultaMonitoreo, alertas = false) {
    const haceDosSemanas = new Date(); haceDosSemanas.setDate(haceDosSemanas.getDate() - 14);
    const filtro = and(eq(monitoreoPlagas.organizacionId, org), q.parcela ? eq(monitoreoPlagas.parcelaId, q.parcela) : undefined,
      alertas ? or(eq(monitoreoPlagas.severidad, 'alta'), eq(monitoreoPlagas.severidad, 'critica')) : q.severidad ? eq(monitoreoPlagas.severidad, q.severidad) : undefined,
      alertas ? gte(monitoreoPlagas.fecha, haceDosSemanas) : q.desde ? gte(monitoreoPlagas.fecha, q.desde) : undefined,
      !alertas && q.hasta ? lte(monitoreoPlagas.fecha, q.hasta) : undefined);
    const consulta = db.select({ ...seleccionarMonitoreo, parcela: parcelas.nombre, cultivo: cultivos.nombreComun }).from(monitoreoPlagas).innerJoin(parcelas, eq(monitoreoPlagas.parcelaId, parcelas.id)).leftJoin(ciclosCultivo, eq(monitoreoPlagas.cicloCultivoId, ciclosCultivo.id)).leftJoin(cultivos, eq(ciclosCultivo.cultivoId, cultivos.id)).where(filtro).orderBy(desc(monitoreoPlagas.fecha));
    if (alertas) return consulta;
    const [data, total] = await Promise.all([consulta.limit(q.limite).offset((q.pagina - 1) * q.limite), db.select({ valor: count() }).from(monitoreoPlagas).where(filtro)]); return { data, total: total[0]?.valor ?? 0 };
  }
  async obtenerMonitoreo(org: string, id: string) {
    const [row] = await db.select({ ...seleccionarMonitoreo, parcela: parcelas.nombre, cultivo: cultivos.nombreComun })
      .from(monitoreoPlagas).innerJoin(parcelas, eq(monitoreoPlagas.parcelaId, parcelas.id))
      .leftJoin(ciclosCultivo, eq(monitoreoPlagas.cicloCultivoId, ciclosCultivo.id)).leftJoin(cultivos, eq(ciclosCultivo.cultivoId, cultivos.id))
      .where(and(eq(monitoreoPlagas.organizacionId, org), eq(monitoreoPlagas.id, id))).limit(1);
    return row;
  }
  async validarParcelaCiclo(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], org: string, parcelaId: string, cicloId?: string | null) { await this.validarCicloActividad(tx, org, parcelaId, cicloId); }
  crearMonitoreo(datos: MonitoreoInput, ctx: ContextoAuditoria) { return db.transaction(async (tx) => { await this.validarCicloActividad(tx, ctx.organizacionId, datos.parcelaId, datos.cicloCultivoId); const [row] = await tx.insert(monitoreoPlagas).values({ ...datos, incidenciaPorcentaje: datos.incidenciaPorcentaje.toFixed(2), organizacionId: ctx.organizacionId, usuarioId: ctx.usuarioId }).returning(); await registrarAuditoria(tx, ctx, 'CREAR', 'monitoreo_plagas', row.id, null, row); return row; }); }
  actualizarMonitoreo(id: string, datos: ActualizarMonitoreoInput, ctx: ContextoAuditoria) { return db.transaction(async (tx) => { const [antes] = await tx.select().from(monitoreoPlagas).where(and(eq(monitoreoPlagas.id, id), eq(monitoreoPlagas.organizacionId, ctx.organizacionId))).for('update'); if (!antes) return undefined; await this.validarCicloActividad(tx, ctx.organizacionId, datos.parcelaId ?? antes.parcelaId, datos.cicloCultivoId ?? antes.cicloCultivoId); const [row] = await tx.update(monitoreoPlagas).set({ ...datos, incidenciaPorcentaje: datos.incidenciaPorcentaje?.toFixed(2), updatedAt: new Date() }).where(eq(monitoreoPlagas.id, id)).returning(); await registrarAuditoria(tx, ctx, 'ACTUALIZAR', 'monitoreo_plagas', id, antes, row); return row; }); }
  eliminarMonitoreo(id: string, ctx: ContextoAuditoria) { return db.transaction(async (tx) => { const [antes] = await tx.select().from(monitoreoPlagas).where(and(eq(monitoreoPlagas.id, id), eq(monitoreoPlagas.organizacionId, ctx.organizacionId))).for('update'); if (!antes) return undefined; await tx.delete(monitoreoPlagas).where(eq(monitoreoPlagas.id, id)); await registrarAuditoria(tx, ctx, 'DESACTIVAR', 'monitoreo_plagas', id, antes, null); return { eliminado: true, id }; }); }

  async listarFotos(org: string, q: ConsultaFotos) {
    const fecha = sql`coalesce(${fotosCampo.fechaCaptura}, ${fotosCampo.createdAt})`;
    const filtro = and(eq(fotosCampo.organizacionId, org), q.parcela ? eq(fotosCampo.parcelaId, q.parcela) : undefined, q.desde ? gte(fecha, q.desde) : undefined, q.hasta ? lte(fecha, q.hasta) : undefined);
    const [data, total] = await Promise.all([db.select().from(fotosCampo).where(filtro).orderBy(desc(fotosCampo.createdAt)).limit(q.limite).offset((q.pagina - 1) * q.limite), db.select({ valor: count() }).from(fotosCampo).where(filtro)]); return { data, total: total[0]?.valor ?? 0 };
  }
  async geojsonFotos(org: string) { const rows = await db.execute(sql`SELECT id,ST_AsGeoJSON(ubicacion)::jsonb AS geometria,jsonb_build_object('parcelaId',parcela_id,'foto',archivo_url,'miniatura',archivo_thumb_url,'descripcion',descripcion,'fechaCaptura',fecha_captura,'etiquetas',etiquetas) AS propiedades FROM fotos_campo WHERE organizacion_id=${org} ORDER BY created_at DESC`); return { type: 'FeatureCollection', features: rows.rows.map((r) => ({ type: 'Feature', id: r.id, geometry: r.geometria, properties: r.propiedades })) }; }
  async validarFotoRefs(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], org: string, d: FotoCampoInput) {
    await this.validarCicloActividad(tx, org, d.parcelaId, d.cicloCultivoId);
    if (d.actividadId) { const [actividad] = await tx.select({ id: actividadesCampo.id }).from(actividadesCampo).where(and(eq(actividadesCampo.id, d.actividadId), eq(actividadesCampo.parcelaId, d.parcelaId), eq(actividadesCampo.organizacionId, org))).limit(1); if (!actividad) throw new AppError(422, 'La actividad no pertenece a la parcela indicada', 'ACTIVIDAD_INVALIDA'); }
  }
  async crearFoto(datos: FotoCampoInput, archivo: { originalUrl: string; miniaturaUrl: string }, ctx: ContextoAuditoria) { return db.transaction(async (tx) => {
    await this.validarFotoRefs(tx, ctx.organizacionId, datos);
    const [row] = await tx.insert(fotosCampo).values({ ...datos, latitud: datos.latitud.toFixed(7), longitud: datos.longitud.toFixed(7), altitud: datos.altitud?.toFixed(2), precisionGps: datos.precisionGps?.toFixed(2), direccionFoto: datos.direccionFoto?.toFixed(2), organizacionId: ctx.organizacionId, usuarioId: ctx.usuarioId, archivoUrl: archivo.originalUrl, archivoThumbUrl: archivo.miniaturaUrl, etiquetas: datos.etiquetas }).returning();
    await registrarAuditoria(tx, ctx, 'CREAR', 'fotos_campo', row.id, null, row); return row;
  }); }
  async eliminarFoto(org: string, id: string, ctx: ContextoAuditoria) { return db.transaction(async (tx) => { const [antes] = await tx.select().from(fotosCampo).where(and(eq(fotosCampo.organizacionId, org), eq(fotosCampo.id, id))).for('update'); if (!antes) return undefined; await tx.delete(fotosCampo).where(eq(fotosCampo.id, id)); await registrarAuditoria(tx, ctx, 'DESACTIVAR', 'fotos_campo', id, antes, null); return antes; }); }
}

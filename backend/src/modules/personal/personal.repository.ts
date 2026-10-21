import { and, asc, count, desc, eq, gte, ilike, lt, lte, or, sql, sum } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import { actividadesCampo } from '../../db/schema-fase2.ts';
import { usuarios } from '../../db/schema-fase1.ts';
import { asistencias, boletasPago, cargos, configuracionLaboral, empleados, feriados, periodosPlanilla, planillas } from '../../db/schema-fase3.ts';
import type { ActualizarEmpleadoInput, CargoInput, ConfiguracionInput, ConsultaEmpleados, EmpleadoInput, FeriadoInput } from './personal.schemas.ts';
import { registrarAuditoria, type ContextoAuditoria } from '../../shared/auditoria.ts';

export class PersonalRepository {
  async listarEmpleados(org: string, q: ConsultaEmpleados) {
    const filtro = and(eq(empleados.organizacionId, org), q.cargo ? eq(empleados.cargo, q.cargo) : undefined, q.estado ? eq(empleados.estado, q.estado) : undefined, q.tipoContrato ? eq(empleados.tipoContrato, q.tipoContrato) : undefined,
      q.busqueda ? or(ilike(empleados.codigo, `%${q.busqueda}%`), ilike(empleados.nombres, `%${q.busqueda}%`), ilike(empleados.apellidos, `%${q.busqueda}%`), ilike(empleados.ci, `%${q.busqueda}%`)) : undefined);
    const [data, total] = await Promise.all([db.select().from(empleados).where(filtro).orderBy(asc(empleados.apellidos), asc(empleados.nombres)).limit(q.limite).offset((q.pagina - 1) * q.limite), db.select({ valor: count() }).from(empleados).where(filtro)]);
    return { data, total: total[0]?.valor ?? 0 };
  }
  async obtenerEmpleado(org: string, id: string) { const [row] = await db.select().from(empleados).where(and(eq(empleados.organizacionId, org), eq(empleados.id, id))).limit(1); return row; }
  async historialEmpleado(org: string, id: string) {
    const [historialPlanillas, historialAsistencias] = await Promise.all([
      db.select({ planilla: planillas, periodo: periodosPlanilla }).from(planillas).innerJoin(periodosPlanilla, eq(periodosPlanilla.id, planillas.periodoId)).where(and(eq(planillas.organizacionId, org), eq(planillas.empleadoId, id))).orderBy(desc(periodosPlanilla.gestion), desc(periodosPlanilla.mes)).limit(100),
      db.select().from(asistencias).where(and(eq(asistencias.organizacionId, org), eq(asistencias.empleadoId, id))).orderBy(desc(asistencias.fecha)).limit(100),
    ]);
    return { planillas: historialPlanillas, asistencias: historialAsistencias };
  }
  async tienePlanillas(org: string, id: string) { const [fila] = await db.select({ n: count() }).from(planillas).where(and(eq(planillas.organizacionId, org), eq(planillas.empleadoId, id))); return Number(fila?.n ?? 0) > 0; }
  async salariosTresMesesCompletos(org: string, id: string, fechaReferencia: string) {
    const [anio, mes] = fechaReferencia.split('-').map(Number);
    return db.select({ gestion: periodosPlanilla.gestion, mes: periodosPlanilla.mes, ganado: sum(planillas.totalGanado) }).from(planillas)
      .innerJoin(periodosPlanilla, eq(periodosPlanilla.id, planillas.periodoId))
      .where(and(eq(planillas.organizacionId, org), eq(planillas.empleadoId, id), sql`${planillas.estado} <> 'anulado'`, or(lt(periodosPlanilla.gestion, anio), and(eq(periodosPlanilla.gestion, anio), lt(periodosPlanilla.mes, mes)))))
      .groupBy(periodosPlanilla.gestion, periodosPlanilla.mes).orderBy(desc(periodosPlanilla.gestion), desc(periodosPlanilla.mes)).limit(3);
  }
  async usuarioPertenece(org: string, usuarioId: string) { const [fila] = await db.select({ id: usuarios.id }).from(usuarios).where(and(eq(usuarios.organizacionId, org), eq(usuarios.id, usuarioId), eq(usuarios.activo, true))).limit(1); return Boolean(fila); }
  async cargoPertenece(org: string, id: string) { const [fila] = await db.select({ id: cargos.id }).from(cargos).where(and(eq(cargos.organizacionId, org), eq(cargos.id, id), eq(cargos.activo, true))).limit(1); return Boolean(fila); }
  crearEmpleado(datos: EmpleadoInput, ctx: ContextoAuditoria) { return db.transaction(async tx => { const [row] = await tx.insert(empleados).values({ ...datos, organizacionId: ctx.organizacionId }).returning(); await registrarAuditoria(tx, ctx, 'CREAR', 'empleados', row.id, null, row); return row; }); }
  actualizarEmpleado(id: string, datos: ActualizarEmpleadoInput, ctx: ContextoAuditoria) { return db.transaction(async tx => { const [antes] = await tx.select().from(empleados).where(and(eq(empleados.id, id), eq(empleados.organizacionId, ctx.organizacionId))).for('update'); if (!antes) return undefined; const [row] = await tx.update(empleados).set({ ...datos, updatedAt: new Date() }).where(eq(empleados.id, id)).returning(); await registrarAuditoria(tx, ctx, 'ACTUALIZAR', 'empleados', id, antes, row); return row; }); }
  async desactivarEmpleado(id: string, ctx: ContextoAuditoria) { return this.actualizarEmpleado(id, { estado: 'inactivo' }, ctx); }
  darDeBaja(id: string, fechaBaja: string, motivoBaja: string, ctx: ContextoAuditoria) { return db.transaction(async tx => { const [antes] = await tx.select().from(empleados).where(and(eq(empleados.id, id), eq(empleados.organizacionId, ctx.organizacionId))).for('update'); if (!antes) return undefined; const [row] = await tx.update(empleados).set({ fechaBaja, motivoBaja, estado: 'inactivo', updatedAt: new Date() }).where(eq(empleados.id, id)).returning(); await registrarAuditoria(tx, ctx, 'ACTUALIZAR', 'empleados', id, antes, row); return { empleado: row, empleadoAnterior: antes }; }); }
  async boletasEmpleado(org: string, id: string) { return db.select({ boleta: boletasPago, planilla: planillas, periodo: periodosPlanilla }).from(boletasPago).innerJoin(planillas, eq(planillas.id, boletasPago.planillaId)).innerJoin(periodosPlanilla, eq(periodosPlanilla.id, planillas.periodoId)).where(and(eq(boletasPago.organizacionId, org), eq(planillas.empleadoId, id))).orderBy(desc(periodosPlanilla.gestion), desc(periodosPlanilla.mes)); }

  async listarCargos(org: string, activo?: boolean) { return db.select().from(cargos).where(and(eq(cargos.organizacionId, org), activo === undefined ? undefined : eq(cargos.activo, activo))).orderBy(asc(cargos.nombre)); }
  async obtenerCargo(org: string, id: string) { const [row] = await db.select().from(cargos).where(and(eq(cargos.organizacionId, org), eq(cargos.id, id))).limit(1); return row; }
  crearCargo(datos: CargoInput, ctx: ContextoAuditoria) { return db.transaction(async tx => { const [row] = await tx.insert(cargos).values({ ...datos, organizacionId: ctx.organizacionId }).returning(); await registrarAuditoria(tx, ctx, 'CREAR', 'cargos', row.id, null, row); return row; }); }
  actualizarCargo(id: string, datos: Partial<CargoInput>, ctx: ContextoAuditoria) { return db.transaction(async tx => { const [antes] = await tx.select().from(cargos).where(and(eq(cargos.id, id), eq(cargos.organizacionId, ctx.organizacionId))).for('update'); if (!antes) return undefined; const [row] = await tx.update(cargos).set({ ...datos, updatedAt: new Date() }).where(eq(cargos.id, id)).returning(); await registrarAuditoria(tx, ctx, 'ACTUALIZAR', 'cargos', id, antes, row); return row; }); }
  async desactivarCargo(id: string, ctx: ContextoAuditoria) { return this.actualizarCargo(id, { activo: false }, ctx); }

  async listarConfiguracion(org: string) { return db.select().from(configuracionLaboral).where(eq(configuracionLaboral.organizacionId, org)).orderBy(desc(configuracionLaboral.gestion)); }
  async obtenerConfiguracion(org: string, gestion: number) { const [row] = await db.select().from(configuracionLaboral).where(and(eq(configuracionLaboral.organizacionId, org), eq(configuracionLaboral.gestion, gestion))).limit(1); return row; }
  crearConfiguracion(datos: ConfiguracionInput, ctx: ContextoAuditoria) { return db.transaction(async tx => { const [row] = await tx.insert(configuracionLaboral).values({ ...datos, organizacionId: ctx.organizacionId, porcentajeAporteSolidario: datos.porcentajeAporteSolidario }).returning(); await registrarAuditoria(tx, ctx, 'CREAR', 'configuracion_laboral', row.id, null, row); return row; }); }
  actualizarConfiguracion(org: string, gestion: number, datos: Partial<Omit<ConfiguracionInput, 'gestion'>>, ctx: ContextoAuditoria) { return db.transaction(async tx => { const [antes] = await tx.select().from(configuracionLaboral).where(and(eq(configuracionLaboral.organizacionId, org), eq(configuracionLaboral.gestion, gestion))).for('update'); if (!antes) return undefined; const [row] = await tx.update(configuracionLaboral).set(datos).where(eq(configuracionLaboral.id, antes.id)).returning(); await registrarAuditoria(tx, ctx, 'ACTUALIZAR', 'configuracion_laboral', row.id, antes, row); return row; }); }
  async desactivarConfiguracion(org: string, gestion: number, ctx: ContextoAuditoria) { return db.transaction(async tx => { const [antes] = await tx.select().from(configuracionLaboral).where(and(eq(configuracionLaboral.organizacionId, org), eq(configuracionLaboral.gestion, gestion))).for('update'); if (!antes) return undefined; const [row] = await tx.update(configuracionLaboral).set({ activo: false }).where(eq(configuracionLaboral.id, antes.id)).returning(); await registrarAuditoria(tx, ctx, 'DESACTIVAR', 'configuracion_laboral', row.id, antes, row); return row; }); }

  async listarFeriados(org: string, gestion?: number, departamento?: string, tipo?: FeriadoInput['tipo']) { return db.select().from(feriados).where(and(eq(feriados.organizacionId, org), gestion ? and(gte(feriados.fecha, `${gestion}-01-01`), lte(feriados.fecha, `${gestion}-12-31`)) : undefined, departamento ? eq(feriados.departamento, departamento) : undefined, tipo ? eq(feriados.tipo, tipo) : undefined)).orderBy(asc(feriados.fecha)); }
  async obtenerFeriado(org: string, id: string) { const [row] = await db.select().from(feriados).where(and(eq(feriados.organizacionId, org), eq(feriados.id, id))).limit(1); return row; }
  crearFeriado(datos: FeriadoInput, ctx: ContextoAuditoria) { return db.transaction(async tx => { const [row] = await tx.insert(feriados).values({ ...datos, organizacionId: ctx.organizacionId }).returning(); await registrarAuditoria(tx, ctx, 'CREAR', 'feriados', row.id, null, row); return row; }); }
  actualizarFeriado(id: string, datos: Partial<FeriadoInput>, ctx: ContextoAuditoria) { return db.transaction(async tx => { const [antes] = await tx.select().from(feriados).where(and(eq(feriados.organizacionId, ctx.organizacionId), eq(feriados.id, id))).for('update'); if (!antes) return undefined; const [row] = await tx.update(feriados).set(datos).where(eq(feriados.id, id)).returning(); await registrarAuditoria(tx, ctx, 'ACTUALIZAR', 'feriados', id, antes, row); return row; }); }
  desactivarFeriado(id: string, ctx: ContextoAuditoria) { return this.actualizarFeriado(id, { activo: false }, ctx); }
  async crearLoteFeriados(datos: FeriadoInput[], ctx: ContextoAuditoria) { return db.transaction(async tx => { const filas = await tx.insert(feriados).values(datos.map(d => ({ ...d, organizacionId: ctx.organizacionId }))).onConflictDoNothing().returning(); for (const row of filas) await registrarAuditoria(tx, ctx, 'CREAR', 'feriados', row.id, null, row); return filas; }); }

  async resumenAguinaldo(org: string, gestion: number) {
    const filas = await db.select({ empleado: empleados, devengado: sum(planillas.totalGanado) }).from(empleados).innerJoin(planillas, eq(planillas.empleadoId, empleados.id)).innerJoin(periodosPlanilla, eq(periodosPlanilla.id, planillas.periodoId)).where(and(eq(empleados.organizacionId, org), eq(periodosPlanilla.gestion, gestion), sql`${planillas.estado} <> 'anulado'`)).groupBy(empleados.id).orderBy(asc(empleados.apellidos), asc(empleados.nombres));
    return filas.map(f => ({ empleado: f.empleado, totalDevengado: Number(f.devengado ?? 0), aguinaldoEstimado: Math.round((Number(f.devengado ?? 0) / 12) * 100) / 100 }));
  }
  async tieneActividadCampo(org: string, usuarioId: string) { const [fila] = await db.select({ n: count() }).from(actividadesCampo).where(and(eq(actividadesCampo.organizacionId, org), eq(actividadesCampo.usuarioId, usuarioId))); return Number(fila?.n ?? 0) > 0; }
}

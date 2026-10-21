import { and, asc, count, eq, ilike } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import { categoriasProducto, unidadesMedida } from '../../db/schema-fase1.ts';
import { registrarAuditoria, type ContextoAuditoria } from '../../shared/auditoria.ts';
import type { ActualizarCategoriaInput, ActualizarUnidadInput, CategoriaInput, UnidadInput } from './catalogos.schemas.ts';

export class CatalogosRepository {
  async listarCategorias(organizacionId: string, pagina: number, limite: number, busqueda: string, activo?: boolean) {
    const filtro = and(eq(categoriasProducto.organizacionId, organizacionId), activo === undefined ? undefined : eq(categoriasProducto.activo, activo), busqueda ? ilike(categoriasProducto.nombre, `%${busqueda}%`) : undefined);
    const [data, total] = await Promise.all([
      db.select().from(categoriasProducto).where(filtro).orderBy(asc(categoriasProducto.nombre)).limit(limite).offset((pagina - 1) * limite),
      db.select({ valor: count() }).from(categoriasProducto).where(filtro),
    ]);
    return { data, total: total[0]?.valor ?? 0 };
  }
  async obtenerCategoria(organizacionId: string, id: string) { const [fila] = await db.select().from(categoriasProducto).where(and(eq(categoriasProducto.id, id), eq(categoriasProducto.organizacionId, organizacionId))).limit(1); return fila; }
  crearCategoria(datos: CategoriaInput, contexto: ContextoAuditoria) { return db.transaction(async (tx) => { const [fila] = await tx.insert(categoriasProducto).values({ ...datos, organizacionId: contexto.organizacionId }).returning(); await registrarAuditoria(tx, contexto, 'CREAR', 'categorias_producto', fila.id, null, fila); return fila; }); }
  actualizarCategoria(id: string, datos: ActualizarCategoriaInput, contexto: ContextoAuditoria) { return db.transaction(async (tx) => { const [anterior] = await tx.select().from(categoriasProducto).where(and(eq(categoriasProducto.id, id), eq(categoriasProducto.organizacionId, contexto.organizacionId))).for('update'); if (!anterior) return undefined; const [fila] = await tx.update(categoriasProducto).set({ ...datos, updatedAt: new Date() }).where(eq(categoriasProducto.id, id)).returning(); await registrarAuditoria(tx, contexto, 'ACTUALIZAR', 'categorias_producto', id, anterior, fila); return fila; }); }
  desactivarCategoria(id: string, contexto: ContextoAuditoria) { return this.cambiarEstadoCategoria(id, false, contexto); }
  private cambiarEstadoCategoria(id: string, activo: boolean, contexto: ContextoAuditoria) { return db.transaction(async (tx) => { const [anterior] = await tx.select().from(categoriasProducto).where(and(eq(categoriasProducto.id, id), eq(categoriasProducto.organizacionId, contexto.organizacionId))).for('update'); if (!anterior) return undefined; const [fila] = await tx.update(categoriasProducto).set({ activo, updatedAt: new Date() }).where(eq(categoriasProducto.id, id)).returning(); await registrarAuditoria(tx, contexto, 'DESACTIVAR', 'categorias_producto', id, anterior, fila); return fila; }); }

  async listarUnidades(organizacionId: string, pagina: number, limite: number, busqueda: string, activo?: boolean) {
    const filtro = and(eq(unidadesMedida.organizacionId, organizacionId), activo === undefined ? undefined : eq(unidadesMedida.activo, activo), busqueda ? ilike(unidadesMedida.nombre, `%${busqueda}%`) : undefined);
    const [data, total] = await Promise.all([
      db.select().from(unidadesMedida).where(filtro).orderBy(asc(unidadesMedida.nombre)).limit(limite).offset((pagina - 1) * limite),
      db.select({ valor: count() }).from(unidadesMedida).where(filtro),
    ]);
    return { data, total: total[0]?.valor ?? 0 };
  }
  async obtenerUnidad(organizacionId: string, id: string) { const [fila] = await db.select().from(unidadesMedida).where(and(eq(unidadesMedida.id, id), eq(unidadesMedida.organizacionId, organizacionId))).limit(1); return fila; }
  crearUnidad(datos: UnidadInput, contexto: ContextoAuditoria) { return db.transaction(async (tx) => { const [fila] = await tx.insert(unidadesMedida).values({ ...datos, organizacionId: contexto.organizacionId }).returning(); await registrarAuditoria(tx, contexto, 'CREAR', 'unidades_medida', fila.id, null, fila); return fila; }); }
  actualizarUnidad(id: string, datos: ActualizarUnidadInput, contexto: ContextoAuditoria) { return db.transaction(async (tx) => { const [anterior] = await tx.select().from(unidadesMedida).where(and(eq(unidadesMedida.id, id), eq(unidadesMedida.organizacionId, contexto.organizacionId))).for('update'); if (!anterior) return undefined; const [fila] = await tx.update(unidadesMedida).set({ ...datos, updatedAt: new Date() }).where(eq(unidadesMedida.id, id)).returning(); await registrarAuditoria(tx, contexto, 'ACTUALIZAR', 'unidades_medida', id, anterior, fila); return fila; }); }
  desactivarUnidad(id: string, contexto: ContextoAuditoria) { return db.transaction(async (tx) => { const [anterior] = await tx.select().from(unidadesMedida).where(and(eq(unidadesMedida.id, id), eq(unidadesMedida.organizacionId, contexto.organizacionId))).for('update'); if (!anterior) return undefined; const [fila] = await tx.update(unidadesMedida).set({ activo: false, updatedAt: new Date() }).where(eq(unidadesMedida.id, id)).returning(); await registrarAuditoria(tx, contexto, 'DESACTIVAR', 'unidades_medida', id, anterior, fila); return fila; }); }
}

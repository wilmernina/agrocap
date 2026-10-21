import { and, asc, count, eq, ilike, or, sql } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import { categoriasProducto, productos, unidadesMedida } from '../../db/schema-fase1.ts';
import { registrarAuditoria, type ContextoAuditoria } from '../../shared/auditoria.ts';
import { AppError } from '../../shared/errors.ts';
import type { ActualizarProductoInput, ConsultaProductos, CrearProductoInput } from './productos.schemas.ts';

const seleccion = {
  id: productos.id, sku: productos.sku, codigoBarras: productos.codigoBarras, nombre: productos.nombre,
  descripcion: productos.descripcion, categoriaId: productos.categoriaId, categoria: categoriasProducto.nombre,
  unidadMedidaId: productos.unidadMedidaId, unidadMedida: unidadesMedida.nombre, abreviatura: unidadesMedida.abreviatura,
  tipo: productos.tipo, precioCosto: productos.precioCosto, precioVenta: productos.precioVenta,
  stockActual: productos.stockActual, stockMinimo: productos.stockMinimo, stockMaximo: productos.stockMaximo,
  requiereReceta: productos.requiereReceta, activo: productos.activo,
  createdAt: productos.createdAt, updatedAt: productos.updatedAt,
};

const valoresPersistencia = (datos: ActualizarProductoInput) => {
  const { precioCosto, precioVenta, stockMinimo, stockMaximo, ...resto } = datos;
  return {
    ...resto,
    ...(precioCosto !== undefined ? { precioCosto: precioCosto.toFixed(2) } : {}),
    ...(precioVenta !== undefined ? { precioVenta: precioVenta.toFixed(2) } : {}),
    ...(stockMinimo !== undefined ? { stockMinimo: stockMinimo.toFixed(3) } : {}),
    ...(stockMaximo !== undefined ? { stockMaximo: stockMaximo === null ? null : stockMaximo.toFixed(3) } : {}),
  };
};

export class ProductosRepository {
  async listar(organizacionId: string, consulta: ConsultaProductos) {
    const filtro = and(
      eq(productos.organizacionId, organizacionId),
      consulta.activo === undefined ? undefined : eq(productos.activo, consulta.activo),
      consulta.categoria ? eq(productos.categoriaId, consulta.categoria) : undefined,
      consulta.tipo ? eq(productos.tipo, consulta.tipo) : undefined,
      consulta.stock_bajo ? sql`${productos.stockActual} <= ${productos.stockMinimo}` : undefined,
      consulta.busqueda ? or(ilike(productos.nombre, `%${consulta.busqueda}%`), ilike(productos.sku, `%${consulta.busqueda}%`), ilike(productos.codigoBarras, `%${consulta.busqueda}%`)) : undefined,
    );
    const [data, total] = await Promise.all([
      db.select(seleccion).from(productos).innerJoin(categoriasProducto, eq(productos.categoriaId, categoriasProducto.id)).innerJoin(unidadesMedida, eq(productos.unidadMedidaId, unidadesMedida.id)).where(filtro).orderBy(asc(productos.nombre)).limit(consulta.limite).offset((consulta.pagina - 1) * consulta.limite),
      db.select({ valor: count() }).from(productos).where(filtro),
    ]);
    return { data, total: total[0]?.valor ?? 0 };
  }

  async obtener(organizacionId: string, id: string) {
    const [fila] = await db.select(seleccion).from(productos).innerJoin(categoriasProducto, eq(productos.categoriaId, categoriasProducto.id)).innerJoin(unidadesMedida, eq(productos.unidadMedidaId, unidadesMedida.id)).where(and(eq(productos.id, id), eq(productos.organizacionId, organizacionId))).limit(1);
    return fila;
  }

  async alertasStock(organizacionId: string) {
    return db.select(seleccion).from(productos).innerJoin(categoriasProducto, eq(productos.categoriaId, categoriasProducto.id)).innerJoin(unidadesMedida, eq(productos.unidadMedidaId, unidadesMedida.id)).where(and(eq(productos.organizacionId, organizacionId), eq(productos.activo, true), sql`${productos.stockActual} <= ${productos.stockMinimo}`)).orderBy(asc(productos.stockActual));
  }

  crear(datos: CrearProductoInput, contexto: ContextoAuditoria) {
    return db.transaction(async (tx) => {
      await this.validarCatalogos(tx, contexto.organizacionId, datos.categoriaId, datos.unidadMedidaId);
      const [fila] = await tx.insert(productos).values({
        organizacionId: contexto.organizacionId,
        sku: datos.sku,
        codigoBarras: datos.codigoBarras,
        nombre: datos.nombre,
        descripcion: datos.descripcion,
        categoriaId: datos.categoriaId,
        unidadMedidaId: datos.unidadMedidaId,
        tipo: datos.tipo,
        precioCosto: datos.precioCosto.toFixed(2),
        precioVenta: datos.precioVenta.toFixed(2),
        stockMinimo: datos.stockMinimo.toFixed(3),
        stockMaximo: datos.stockMaximo == null ? null : datos.stockMaximo.toFixed(3),
        requiereReceta: datos.requiereReceta,
        activo: datos.activo,
      }).returning();
      await registrarAuditoria(tx, contexto, 'CREAR', 'productos', fila.id, null, fila);
      return fila;
    });
  }

  actualizar(id: string, datos: ActualizarProductoInput, contexto: ContextoAuditoria) {
    return db.transaction(async (tx) => {
      const [anterior] = await tx.select().from(productos).where(and(eq(productos.id, id), eq(productos.organizacionId, contexto.organizacionId))).for('update');
      if (!anterior) return undefined;
      if (datos.categoriaId || datos.unidadMedidaId) await this.validarCatalogos(tx, contexto.organizacionId, datos.categoriaId ?? anterior.categoriaId, datos.unidadMedidaId ?? anterior.unidadMedidaId);
      const minimoResultante = datos.stockMinimo ?? Number(anterior.stockMinimo);
      const maximoResultante = datos.stockMaximo === undefined ? (anterior.stockMaximo === null ? null : Number(anterior.stockMaximo)) : datos.stockMaximo;
      if (maximoResultante !== null && maximoResultante < minimoResultante) {
        throw new AppError(422, 'El stock máximo debe ser mayor o igual al stock mínimo', 'RANGO_STOCK_INVALIDO');
      }
      const [fila] = await tx.update(productos).set({ ...valoresPersistencia(datos), updatedAt: new Date() }).where(eq(productos.id, id)).returning();
      await registrarAuditoria(tx, contexto, 'ACTUALIZAR', 'productos', id, anterior, fila);
      return fila;
    });
  }

  desactivar(id: string, contexto: ContextoAuditoria) {
    return db.transaction(async (tx) => {
      const [anterior] = await tx.select().from(productos).where(and(eq(productos.id, id), eq(productos.organizacionId, contexto.organizacionId))).for('update');
      if (!anterior) return undefined;
      const [fila] = await tx.update(productos).set({ activo: false, updatedAt: new Date() }).where(eq(productos.id, id)).returning();
      await registrarAuditoria(tx, contexto, 'DESACTIVAR', 'productos', id, anterior, fila);
      return fila;
    });
  }

  private async validarCatalogos(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], organizacionId: string, categoriaId: string, unidadId: string) {
    const [categoria] = await tx.select({ id: categoriasProducto.id }).from(categoriasProducto).where(and(eq(categoriasProducto.id, categoriaId), eq(categoriasProducto.organizacionId, organizacionId), eq(categoriasProducto.activo, true))).limit(1);
    const [unidad] = await tx.select({ id: unidadesMedida.id }).from(unidadesMedida).where(and(eq(unidadesMedida.id, unidadId), eq(unidadesMedida.organizacionId, organizacionId), eq(unidadesMedida.activo, true))).limit(1);
    if (!categoria) throw new AppError(422, 'La categoría no existe o está inactiva', 'CATEGORIA_INVALIDA');
    if (!unidad) throw new AppError(422, 'La unidad de medida no existe o está inactiva', 'UNIDAD_INVALIDA');
  }
}

import { and, count, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import { almacenes, existenciasAlmacen, lotesProducto, movimientosInventario, organizaciones, productos, usuarios } from '../../db/schema-fase1.ts';
import type { ContextoAuditoria, TransaccionDB } from '../../shared/auditoria.ts';
import { registrarAuditoria } from '../../shared/auditoria.ts';
import { AppError } from '../../shared/errors.ts';
import { calcularNuevoStock } from '../../shared/reglas-negocio.ts';
import type { AjusteInventarioInput, ConsultaMovimientos } from './inventario.schemas.ts';

type CambioStock = {
  productoId: string; almacenId: string; delta: number; tipo: 'entrada' | 'salida' | 'ajuste' | 'transferencia' | 'devolucion';
  motivo: string; referenciaTipo: string; referenciaId?: string; loteProductoId?: string | null; parcelaId?: string | null;
  clienteId?: string | null; campaniaId?: string | null; cicloCultivoId?: string | null; actividadCampoId?: string | null; ordenTrabajoId?: string | null;
};

export async function aplicarCambioStock(tx: TransaccionDB, contexto: ContextoAuditoria, cambio: CambioStock) {
  const [organizacion] = await tx.select({ permite: organizaciones.permiteStockNegativo }).from(organizaciones).where(eq(organizaciones.id, contexto.organizacionId)).limit(1);
  const [producto] = await tx.select({ id: productos.id, nombre: productos.nombre, stock: productos.stockActual, costo: productos.precioCosto }).from(productos).where(and(eq(productos.id, cambio.productoId), eq(productos.organizacionId, contexto.organizacionId), eq(productos.activo, true))).for('update');
  const [almacen] = await tx.select({ id: almacenes.id }).from(almacenes).where(and(eq(almacenes.id, cambio.almacenId), eq(almacenes.organizacionId, contexto.organizacionId), eq(almacenes.activo, true))).limit(1);
  if (!producto) throw new AppError(422, 'Producto inexistente o inactivo', 'PRODUCTO_INVALIDO');
  if (!almacen) throw new AppError(422, 'Almacén inexistente o inactivo', 'ALMACEN_INVALIDO');
  await tx.insert(existenciasAlmacen).values({ organizacionId: contexto.organizacionId, almacenId: cambio.almacenId, productoId: cambio.productoId, cantidad: '0' }).onConflictDoNothing();
  const [existencia] = await tx.select().from(existenciasAlmacen).where(and(eq(existenciasAlmacen.almacenId, cambio.almacenId), eq(existenciasAlmacen.productoId, cambio.productoId))).for('update');
  const anterior = Number(existencia.cantidad);
  let nuevo: number;
  try { nuevo = calcularNuevoStock(anterior, cambio.delta, organizacion?.permite ?? false); }
  catch (error) { if (error instanceof AppError && error.code === 'STOCK_INSUFICIENTE') throw new AppError(409, `Stock insuficiente para ${producto.nombre}`, 'STOCK_INSUFICIENTE'); throw error; }
  await tx.update(existenciasAlmacen).set({ cantidad: nuevo.toFixed(3), updatedAt: new Date() }).where(and(eq(existenciasAlmacen.almacenId, cambio.almacenId), eq(existenciasAlmacen.productoId, cambio.productoId)));
  await tx.update(productos).set({ stockActual: sql`${productos.stockActual} + ${cambio.delta.toFixed(3)}`, updatedAt: new Date() }).where(eq(productos.id, cambio.productoId));
  const [loteCosto] = cambio.loteProductoId ? await tx.select({ costo: lotesProducto.costoUnitario }).from(lotesProducto).where(and(eq(lotesProducto.id, cambio.loteProductoId), eq(lotesProducto.organizacionId, contexto.organizacionId))).limit(1) : [];
  const costoUnitario = Number(loteCosto?.costo ?? producto.costo);
  const [movimiento] = await tx.insert(movimientosInventario).values({
    organizacionId: contexto.organizacionId, productoId: cambio.productoId, almacenId: cambio.almacenId,
    loteProductoId: cambio.loteProductoId, tipo: cambio.tipo, cantidad: Math.abs(cambio.delta).toFixed(3),
    stockAnterior: anterior.toFixed(3), stockNuevo: nuevo.toFixed(3), motivo: cambio.motivo,
    referenciaTipo: cambio.referenciaTipo, referenciaId: cambio.referenciaId, parcelaId: cambio.parcelaId,
    clienteId: cambio.clienteId, campaniaId: cambio.campaniaId, cicloCultivoId: cambio.cicloCultivoId,
    actividadCampoId: cambio.actividadCampoId, ordenTrabajoId: cambio.ordenTrabajoId,
    costoUnitario: costoUnitario.toFixed(4), valorMovimiento: (Math.abs(cambio.delta) * costoUnitario).toFixed(2),
    usuarioId: contexto.usuarioId,
  }).returning();
  return movimiento;
}

export class InventarioRepository {
  listarAlmacenes(org: string) { return db.select().from(almacenes).where(and(eq(almacenes.organizacionId, org), eq(almacenes.activo, true))).orderBy(almacenes.nombre); }
  listarExistencias(org: string, almacenId?: string) { return db.select({ productoId: productos.id, sku: productos.sku, producto: productos.nombre, almacenId: almacenes.id, almacen: almacenes.nombre, cantidad: existenciasAlmacen.cantidad, stockMinimo: productos.stockMinimo, updatedAt: existenciasAlmacen.updatedAt }).from(existenciasAlmacen).innerJoin(productos, eq(existenciasAlmacen.productoId, productos.id)).innerJoin(almacenes, eq(existenciasAlmacen.almacenId, almacenes.id)).where(and(eq(existenciasAlmacen.organizacionId, org), almacenId ? eq(existenciasAlmacen.almacenId, almacenId) : undefined)).orderBy(productos.nombre); }
  async listar(org: string, consulta: ConsultaMovimientos) {
    const filtro = and(eq(movimientosInventario.organizacionId, org), consulta.productoId ? eq(movimientosInventario.productoId, consulta.productoId) : undefined, consulta.almacenId ? eq(movimientosInventario.almacenId, consulta.almacenId) : undefined, consulta.tipo ? eq(movimientosInventario.tipo, consulta.tipo) : undefined, consulta.desde ? gte(movimientosInventario.createdAt, consulta.desde) : undefined, consulta.hasta ? lte(movimientosInventario.createdAt, consulta.hasta) : undefined);
    const [data, total] = await Promise.all([
      db.select({ id: movimientosInventario.id, productoId: productos.id, producto: productos.nombre, sku: productos.sku, almacen: almacenes.nombre, tipo: movimientosInventario.tipo, cantidad: movimientosInventario.cantidad, stockAnterior: movimientosInventario.stockAnterior, stockNuevo: movimientosInventario.stockNuevo, costoUnitario: movimientosInventario.costoUnitario, valorMovimiento: movimientosInventario.valorMovimiento, motivo: movimientosInventario.motivo, referenciaTipo: movimientosInventario.referenciaTipo, referenciaId: movimientosInventario.referenciaId, parcelaId: movimientosInventario.parcelaId, usuario: usuarios.nombre, createdAt: movimientosInventario.createdAt }).from(movimientosInventario).innerJoin(productos, eq(movimientosInventario.productoId, productos.id)).innerJoin(almacenes, eq(movimientosInventario.almacenId, almacenes.id)).innerJoin(usuarios, eq(movimientosInventario.usuarioId, usuarios.id)).where(filtro).orderBy(desc(movimientosInventario.createdAt)).limit(consulta.limite).offset((consulta.pagina - 1) * consulta.limite),
      db.select({ valor: count() }).from(movimientosInventario).where(filtro),
    ]); return { data, total: total[0]?.valor ?? 0 };
  }
  ajustar(datos: AjusteInventarioInput, contexto: ContextoAuditoria) {
    return db.transaction(async (tx) => {
      if (datos.loteProductoId) { const [lote] = await tx.select().from(lotesProducto).where(and(eq(lotesProducto.id, datos.loteProductoId), eq(lotesProducto.organizacionId, contexto.organizacionId), eq(lotesProducto.productoId, datos.productoId), eq(lotesProducto.almacenId, datos.almacenId))).for('update'); if (!lote) throw new AppError(422, 'Lote inválido', 'LOTE_INVALIDO'); const nueva = Number(lote.cantidadActual) + (datos.direccion === 'entrada' ? datos.cantidad : -datos.cantidad); if (nueva < 0) throw new AppError(409, 'Cantidad insuficiente en el lote', 'LOTE_INSUFICIENTE'); await tx.update(lotesProducto).set({ cantidadActual: nueva.toFixed(3), updatedAt: new Date() }).where(eq(lotesProducto.id, lote.id)); }
      const movimiento = await aplicarCambioStock(tx, contexto, { productoId: datos.productoId, almacenId: datos.almacenId, delta: datos.direccion === 'entrada' ? datos.cantidad : -datos.cantidad, tipo: 'ajuste', motivo: datos.motivo, referenciaTipo: 'ajuste', loteProductoId: datos.loteProductoId, parcelaId: datos.parcelaId });
      await registrarAuditoria(tx, contexto, 'CREAR', 'movimientos_inventario', movimiento.id, null, movimiento);
      return movimiento;
    });
  }
}

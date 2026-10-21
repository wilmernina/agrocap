import { and, asc, desc, eq, gte, inArray, lte, sql, sum } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import { almacenes, categoriasProducto, clientes, detalleVenta, movimientosInventario, pagosVenta, productos, ventas } from '../../db/schema-fase1.ts';
import { actividadesCampo, ciclosCultivo, cultivos, fincas, fotosCampo, monitoreoPlagas, parcelas } from '../../db/schema-fase2.ts';
import { NotFoundError } from '../../shared/errors.ts';

export class ReportesRepository {
  async ventasPeriodo(organizacionId: string, desde: Date, hasta: Date) {
    const estados = ['confirmada', 'pagada'] as const;
    const filtro = and(eq(ventas.organizacionId, organizacionId), inArray(ventas.estado, estados), gte(ventas.fecha, desde), lte(ventas.fecha, hasta));
    const pagos = db.select({ ventaId: pagosVenta.ventaId, pagado: sum(pagosVenta.monto).as('pagado') }).from(pagosVenta).groupBy(pagosVenta.ventaId).as('pagos_reporte');
    const data = await db.select({ id: ventas.id, numeroFactura: ventas.numeroFactura, fecha: ventas.fecha, cliente: clientes.nombre, tipoPago: ventas.tipoPago, estado: ventas.estado, subtotal: ventas.subtotal, descuento: ventas.descuento, impuestos: ventas.impuestos, total: ventas.total, pagado: sql<string>`coalesce(${pagos.pagado}, 0)`, saldo: sql<string>`(${ventas.total} - coalesce(${pagos.pagado}, 0))::numeric(12,2)` }).from(ventas).leftJoin(clientes, eq(ventas.clienteId, clientes.id)).leftJoin(pagos, eq(ventas.id, pagos.ventaId)).where(filtro).orderBy(desc(ventas.fecha));
    const resumen = data.reduce((acc, fila) => ({ cantidad: acc.cantidad + 1, subtotal: acc.subtotal + Number(fila.subtotal), descuentos: acc.descuentos + Number(fila.descuento), impuestos: acc.impuestos + Number(fila.impuestos), total: acc.total + Number(fila.total), cobrado: acc.cobrado + Number(fila.pagado), saldo: acc.saldo + Number(fila.saldo) }), { cantidad: 0, subtotal: 0, descuentos: 0, impuestos: 0, total: 0, cobrado: 0, saldo: 0 });
    return { resumen, data };
  }

  async productosMasVendidos(organizacionId: string, limite: number, desde?: Date, hasta?: Date) {
    return db.select({ productoId: productos.id, sku: productos.sku, producto: productos.nombre, categoria: categoriasProducto.nombre, cantidadVendida: sql<string>`sum(${detalleVenta.cantidad})::numeric(14,3)`, importeVendido: sql<string>`sum(${detalleVenta.subtotal})::numeric(14,2)`, numeroVentas: sql<number>`count(distinct ${ventas.id})::int` }).from(detalleVenta).innerJoin(ventas, eq(detalleVenta.ventaId, ventas.id)).innerJoin(productos, eq(detalleVenta.productoId, productos.id)).innerJoin(categoriasProducto, eq(productos.categoriaId, categoriasProducto.id)).where(and(eq(ventas.organizacionId, organizacionId), inArray(ventas.estado, ['confirmada', 'pagada']), desde ? gte(ventas.fecha, desde) : undefined, hasta ? lte(ventas.fecha, hasta) : undefined)).groupBy(productos.id, categoriasProducto.nombre).orderBy(desc(sql`sum(${detalleVenta.cantidad})`)).limit(limite);
  }

  async stockValorizado(organizacionId: string) {
    const data = await db.select({ productoId: productos.id, sku: productos.sku, producto: productos.nombre, categoria: categoriasProducto.nombre, stockActual: productos.stockActual, precioCosto: productos.precioCosto, valorCosto: sql<string>`(${productos.stockActual} * ${productos.precioCosto})::numeric(14,2)`, precioVenta: productos.precioVenta, valorVenta: sql<string>`(${productos.stockActual} * ${productos.precioVenta})::numeric(14,2)` }).from(productos).innerJoin(categoriasProducto, eq(productos.categoriaId, categoriasProducto.id)).where(and(eq(productos.organizacionId, organizacionId), eq(productos.activo, true))).orderBy(asc(productos.nombre));
    return { resumen: data.reduce((acc, fila) => ({ productos: acc.productos + 1, unidades: acc.unidades + Number(fila.stockActual), valorCosto: acc.valorCosto + Number(fila.valorCosto), valorVenta: acc.valorVenta + Number(fila.valorVenta) }), { productos: 0, unidades: 0, valorCosto: 0, valorVenta: 0 }), data };
  }

  async kardex(organizacionId: string, productoId: string, desde?: Date, hasta?: Date, almacenId?: string) {
    const [producto] = await db.select({ id: productos.id, sku: productos.sku, nombre: productos.nombre, stockActual: productos.stockActual }).from(productos).where(and(eq(productos.id, productoId), eq(productos.organizacionId, organizacionId))).limit(1);
    if (!producto) throw new NotFoundError('Producto');
    const movimientos = await db.select({ id: movimientosInventario.id, fecha: movimientosInventario.createdAt, almacen: almacenes.nombre, tipo: movimientosInventario.tipo, cantidad: movimientosInventario.cantidad, stockAnterior: movimientosInventario.stockAnterior, stockNuevo: movimientosInventario.stockNuevo, costoUnitario: movimientosInventario.costoUnitario, valorMovimiento: movimientosInventario.valorMovimiento, motivo: movimientosInventario.motivo, referenciaTipo: movimientosInventario.referenciaTipo, referenciaId: movimientosInventario.referenciaId, parcelaId: movimientosInventario.parcelaId }).from(movimientosInventario).innerJoin(almacenes, eq(movimientosInventario.almacenId, almacenes.id)).where(and(eq(movimientosInventario.organizacionId, organizacionId), eq(movimientosInventario.productoId, productoId), almacenId ? eq(movimientosInventario.almacenId, almacenId) : undefined, desde ? gte(movimientosInventario.createdAt, desde) : undefined, hasta ? lte(movimientosInventario.createdAt, hasta) : undefined)).orderBy(asc(movimientosInventario.createdAt));
    return { producto, movimientos };
  }

  async superficiePorCultivo(organizacionId: string, fincaId?: string) {
    const resultado = await db.execute(sql`select c.id as "cultivoId", c.nombre_comun as "cultivo", c.variedad,
      count(distinct p.id)::int as "parcelas", coalesce(sum(p.superficie_calculada),0)::numeric(14,2) as "superficieM2",
      (coalesce(sum(p.superficie_calculada),0)/10000)::numeric(14,4) as "superficieHectareas"
      from ciclos_cultivo cc join cultivos c on c.id=cc.cultivo_id and c.organizacion_id=${organizacionId}
      join parcelas p on p.id=cc.parcela_id and p.organizacion_id=${organizacionId} and p.activo=true
      where cc.organizacion_id=${organizacionId} and cc.estado='en_curso' ${fincaId ? sql`and p.finca_id=${fincaId}` : sql``}
      group by c.id,c.nombre_comun,c.variedad order by "superficieM2" desc`);
    return resultado.rows;
  }

  async actividadesPorParcela(organizacionId: string, desde?: Date, hasta?: Date, fincaId?: string) {
    const resultado = await db.execute(sql`select p.id as "parcelaId",p.nombre as "parcela",p.codigo,f.nombre as "finca",
      a.tipo,count(a.id)::int as "cantidadActividades",coalesce(sum(a.costo_total),0)::numeric(14,2) as "costoTotal"
      from parcelas p join fincas f on f.id=p.finca_id and f.organizacion_id=${organizacionId}
      left join actividades_campo a on a.parcela_id=p.id and a.organizacion_id=${organizacionId}
      and (${desde ?? null}::timestamptz is null or a.fecha>=${desde ?? null}) and (${hasta ?? null}::timestamptz is null or a.fecha<=${hasta ?? null})
      where p.organizacion_id=${organizacionId} and p.activo=true ${fincaId ? sql`and p.finca_id=${fincaId}` : sql``}
      group by p.id,p.nombre,p.codigo,f.nombre,a.tipo order by p.nombre,a.tipo`);
    return resultado.rows;
  }

  async costosPorParcela(organizacionId: string, desde?: Date, hasta?: Date, fincaId?: string) {
    const resultado = await db.execute(sql`select p.id as "parcelaId",p.nombre as "parcela",p.codigo,f.nombre as "finca",
      count(a.id)::int as "cantidadActividades",
      coalesce(sum(greatest(a.costo_total-coalesce(a.cantidad_producto*a.costo_producto_unitario,0),0)),0)::numeric(14,2) as "otrosCostos",
      coalesce(sum(coalesce(a.cantidad_producto*a.costo_producto_unitario,0)),0)::numeric(14,2) as "costoProductos",
      coalesce(sum(a.costo_total),0)::numeric(14,2) as "costoTotal"
      from parcelas p join fincas f on f.id=p.finca_id and f.organizacion_id=${organizacionId}
      left join actividades_campo a on a.parcela_id=p.id and a.organizacion_id=${organizacionId}
      and (${desde ?? null}::timestamptz is null or a.fecha>=${desde ?? null}) and (${hasta ?? null}::timestamptz is null or a.fecha<=${hasta ?? null})
      where p.organizacion_id=${organizacionId} and p.activo=true ${fincaId ? sql`and p.finca_id=${fincaId}` : sql``}
      group by p.id,p.nombre,p.codigo,f.nombre order by "costoTotal" desc`);
    return resultado.rows;
  }

  async productividadPorCultivo(organizacionId: string, desde?: Date, hasta?: Date) {
    const resultado = await db.execute(sql`select c.id as "cultivoId",c.nombre_comun as "cultivo",c.variedad,
      coalesce(cc.unidad_rendimiento,'sin unidad') as "unidadRendimiento",count(*)::int as "ciclosCosechados",
      coalesce(sum(cc.rendimiento_real),0)::numeric(14,3) as "rendimientoTotal",
      coalesce(avg(cc.rendimiento_real),0)::numeric(14,3) as "rendimientoPromedio",
      coalesce(sum(p.superficie_calculada),0)::numeric(14,2) as "superficieM2"
      from ciclos_cultivo cc join cultivos c on c.id=cc.cultivo_id and c.organizacion_id=${organizacionId}
      join parcelas p on p.id=cc.parcela_id and p.organizacion_id=${organizacionId}
      where cc.organizacion_id=${organizacionId} and cc.estado='cosechado' and cc.rendimiento_real is not null
      and (${desde ?? null}::date is null or cc.fecha_cosecha_real>=(${desde ?? null}::timestamptz)::date)
      and (${hasta ?? null}::date is null or cc.fecha_cosecha_real<=(${hasta ?? null}::timestamptz)::date)
      group by c.id,c.nombre_comun,c.variedad,cc.unidad_rendimiento order by c.nombre_comun,"rendimientoTotal" desc`);
    return resultado.rows;
  }

  async kardexParcela(organizacionId: string, parcelaId: string, desde?: Date, hasta?: Date) {
    const [parcela] = await db.select({ id: parcelas.id, nombre: parcelas.nombre, codigo: parcelas.codigo, superficieCalculada: parcelas.superficieCalculada, finca: fincas.nombre })
      .from(parcelas).innerJoin(fincas, eq(parcelas.fincaId, fincas.id)).where(and(eq(parcelas.id, parcelaId), eq(parcelas.organizacionId, organizacionId), eq(fincas.organizacionId, organizacionId))).limit(1);
    if (!parcela) throw new NotFoundError('Parcela');
    const fechaAct = (campo: typeof actividadesCampo.fecha) => and(desde ? gte(campo, desde) : undefined, hasta ? lte(campo, hasta) : undefined);
    const actividades = await db.select({ tipoEvento: sql<string>`case when ${actividadesCampo.productoId} is not null then 'aplicacion' else 'actividad' end`, id: actividadesCampo.id, fecha: actividadesCampo.fecha, tipo: actividadesCampo.tipo, descripcion: actividadesCampo.descripcion, costo: actividadesCampo.costoTotal, productoId: actividadesCampo.productoId, cantidadProducto: actividadesCampo.cantidadProducto, costoProductoUnitario: actividadesCampo.costoProductoUnitario, cicloCultivoId: actividadesCampo.cicloCultivoId }).from(actividadesCampo).where(and(eq(actividadesCampo.organizacionId, organizacionId), eq(actividadesCampo.parcelaId, parcelaId), fechaAct(actividadesCampo.fecha)));
    const fotos = await db.select({ tipoEvento: sql<string>`'foto'`, id: fotosCampo.id, fecha: fotosCampo.createdAt, descripcion: fotosCampo.descripcion, archivoUrl: fotosCampo.archivoUrl, archivoThumbUrl: fotosCampo.archivoThumbUrl, cicloCultivoId: fotosCampo.cicloCultivoId }).from(fotosCampo).where(and(eq(fotosCampo.organizacionId, organizacionId), eq(fotosCampo.parcelaId, parcelaId), desde ? gte(fotosCampo.createdAt, desde) : undefined, hasta ? lte(fotosCampo.createdAt, hasta) : undefined));
    const monitoreos = await db.select({ tipoEvento: sql<string>`'monitoreo'`, id: monitoreoPlagas.id, fecha: monitoreoPlagas.fecha, descripcion: monitoreoPlagas.plagaEnfermedad, severidad: monitoreoPlagas.severidad, incidenciaPorcentaje: monitoreoPlagas.incidenciaPorcentaje, accionTomada: monitoreoPlagas.accionTomada, cicloCultivoId: monitoreoPlagas.cicloCultivoId }).from(monitoreoPlagas).where(and(eq(monitoreoPlagas.organizacionId, organizacionId), eq(monitoreoPlagas.parcelaId, parcelaId), desde ? gte(monitoreoPlagas.fecha, desde) : undefined, hasta ? lte(monitoreoPlagas.fecha, hasta) : undefined));
    const cosechas = await db.select({ tipoEvento: sql<string>`'cosecha'`, id: ciclosCultivo.id, fecha: sql<Date>`(${ciclosCultivo.fechaCosechaReal}::date)::timestamptz`, cultivo: cultivos.nombreComun, variedad: cultivos.variedad, rendimientoReal: ciclosCultivo.rendimientoReal, unidadRendimiento: ciclosCultivo.unidadRendimiento, cicloCultivoId: ciclosCultivo.id }).from(ciclosCultivo).innerJoin(cultivos, eq(ciclosCultivo.cultivoId, cultivos.id)).where(and(eq(ciclosCultivo.organizacionId, organizacionId), eq(ciclosCultivo.parcelaId, parcelaId), eq(ciclosCultivo.estado, 'cosechado'), desde ? gte(ciclosCultivo.fechaCosechaReal, desde.toISOString().slice(0,10)) : undefined, hasta ? lte(ciclosCultivo.fechaCosechaReal, hasta.toISOString().slice(0,10)) : undefined));
    const movimientos = [...actividades, ...fotos, ...monitoreos, ...cosechas].sort((a,b) => new Date(a.fecha).getTime()-new Date(b.fecha).getTime());
    return { parcela, movimientos };
  }
}

import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  index,
  inet,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

// Enumeraciones del dominio. Sus valores coinciden con el lenguaje de la UI y la API.
export const rolUsuarioEnum = pgEnum('rol_usuario', ['admin', 'vendedor', 'tecnico', 'almacenero']);
export const tipoProductoEnum = pgEnum('tipo_producto', [
  'semilla', 'fertilizante', 'herbicida', 'fungicida', 'insecticida',
  'herramienta', 'maquinaria', 'otro',
]);
export const tipoClienteEnum = pgEnum('tipo_cliente', ['externo', 'socio', 'interno']);
export const tipoMovimientoEnum = pgEnum('tipo_movimiento', ['entrada', 'salida', 'ajuste', 'transferencia', 'devolucion']);
export const estadoCompraEnum = pgEnum('estado_compra', ['borrador', 'confirmada', 'anulada']);
export const tipoPagoVentaEnum = pgEnum('tipo_pago_venta', ['contado', 'credito']);
export const estadoVentaEnum = pgEnum('estado_venta', ['borrador', 'confirmada', 'pagada', 'anulada']);
export const metodoPagoEnum = pgEnum('metodo_pago', ['efectivo', 'transferencia', 'qr', 'cheque']);

const auditoriaFechas = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
};

export const organizaciones = pgTable('organizaciones', {
  id: uuid('id').primaryKey().defaultRandom(),
  nombre: varchar('nombre', { length: 160 }).notNull(),
  nit: varchar('nit', { length: 40 }),
  moneda: varchar('moneda', { length: 3 }).notNull().default('BOB'),
  zonaHoraria: varchar('zona_horaria', { length: 60 }).notNull().default('America/La_Paz'),
  permiteStockNegativo: boolean('permite_stock_negativo').notNull().default(false),
  activo: boolean('activo').notNull().default(true),
  ...auditoriaFechas,
});

export const usuarios = pgTable('usuarios', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizacionId: uuid('organizacion_id').notNull().references(() => organizaciones.id),
  nombre: varchar('nombre', { length: 120 }).notNull(),
  email: varchar('email', { length: 180 }).notNull(),
  passwordHash: text('password_hash').notNull(),
  rol: rolUsuarioEnum('rol').notNull().default('vendedor'),
  activo: boolean('activo').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (tabla) => [
  uniqueIndex('usuarios_email_uq').on(tabla.email),
  index('usuarios_organizacion_idx').on(tabla.organizacionId),
]);

export const tokensRenovacion = pgTable('tokens_renovacion', {
  id: uuid('id').primaryKey().defaultRandom(),
  usuarioId: uuid('usuario_id').notNull().references(() => usuarios.id, { onDelete: 'cascade' }),
  tokenHash: varchar('token_hash', { length: 64 }).notNull(),
  expiraEn: timestamp('expira_en', { withTimezone: true }).notNull(),
  revocadoEn: timestamp('revocado_en', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (tabla) => [
  uniqueIndex('tokens_renovacion_hash_uq').on(tabla.tokenHash),
  index('tokens_renovacion_usuario_idx').on(tabla.usuarioId),
]);

export const categoriasProducto = pgTable('categorias_producto', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizacionId: uuid('organizacion_id').notNull().references(() => organizaciones.id),
  nombre: varchar('nombre', { length: 100 }).notNull(),
  descripcion: text('descripcion'),
  activo: boolean('activo').notNull().default(true),
  ...auditoriaFechas,
}, (tabla) => [uniqueIndex('categorias_producto_org_nombre_uq').on(tabla.organizacionId, tabla.nombre)]);

export const unidadesMedida = pgTable('unidades_medida', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizacionId: uuid('organizacion_id').notNull().references(() => organizaciones.id),
  nombre: varchar('nombre', { length: 80 }).notNull(),
  abreviatura: varchar('abreviatura', { length: 12 }).notNull(),
  activo: boolean('activo').notNull().default(true),
  ...auditoriaFechas,
}, (tabla) => [uniqueIndex('unidades_medida_org_abreviatura_uq').on(tabla.organizacionId, tabla.abreviatura)]);

export const productos = pgTable('productos', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizacionId: uuid('organizacion_id').notNull().references(() => organizaciones.id),
  sku: varchar('sku', { length: 60 }).notNull(),
  codigoBarras: varchar('codigo_barras', { length: 80 }),
  nombre: varchar('nombre', { length: 160 }).notNull(),
  descripcion: text('descripcion'),
  categoriaId: uuid('categoria_id').notNull().references(() => categoriasProducto.id),
  unidadMedidaId: uuid('unidad_medida_id').notNull().references(() => unidadesMedida.id),
  tipo: tipoProductoEnum('tipo').notNull().default('otro'),
  precioCosto: numeric('precio_costo', { precision: 12, scale: 2 }).notNull().default('0'),
  precioVenta: numeric('precio_venta', { precision: 12, scale: 2 }).notNull().default('0'),
  stockActual: numeric('stock_actual', { precision: 14, scale: 3 }).notNull().default('0'),
  stockMinimo: numeric('stock_minimo', { precision: 14, scale: 3 }).notNull().default('0'),
  stockMaximo: numeric('stock_maximo', { precision: 14, scale: 3 }),
  requiereReceta: boolean('requiere_receta').notNull().default(false),
  activo: boolean('activo').notNull().default(true),
  ...auditoriaFechas,
}, (tabla) => [
  uniqueIndex('productos_fase1_org_sku_uq').on(tabla.organizacionId, tabla.sku),
  uniqueIndex('productos_fase1_org_codigo_barras_uq').on(tabla.organizacionId, tabla.codigoBarras),
  index('productos_fase1_busqueda_idx').on(tabla.organizacionId, tabla.nombre),
  index('productos_fase1_categoria_idx').on(tabla.categoriaId),
  check('productos_fase1_precios_ck', sql`${tabla.precioCosto} >= 0 AND ${tabla.precioVenta} >= 0`),
  check('productos_fase1_stock_ck', sql`${tabla.stockMinimo} >= 0 AND (${tabla.stockMaximo} IS NULL OR ${tabla.stockMaximo} >= ${tabla.stockMinimo})`),
]);

export const proveedores = pgTable('proveedores', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizacionId: uuid('organizacion_id').notNull().references(() => organizaciones.id),
  nombre: varchar('nombre', { length: 160 }).notNull(),
  nit: varchar('nit', { length: 40 }),
  telefono: varchar('telefono', { length: 30 }),
  email: varchar('email', { length: 180 }),
  direccion: text('direccion'),
  contacto: varchar('contacto', { length: 140 }),
  activo: boolean('activo').notNull().default(true),
  ...auditoriaFechas,
}, (tabla) => [
  index('proveedores_org_nombre_idx').on(tabla.organizacionId, tabla.nombre),
  uniqueIndex('proveedores_org_nit_uq').on(tabla.organizacionId, tabla.nit),
]);

export const clientes = pgTable('clientes', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizacionId: uuid('organizacion_id').notNull().references(() => organizaciones.id),
  nombre: varchar('nombre', { length: 160 }).notNull(),
  nitCi: varchar('nit_ci', { length: 40 }),
  telefono: varchar('telefono', { length: 30 }),
  email: varchar('email', { length: 180 }),
  direccion: text('direccion'),
  tipo: tipoClienteEnum('tipo').notNull().default('externo'),
  limiteCredito: numeric('limite_credito', { precision: 12, scale: 2 }).notNull().default('0'),
  activo: boolean('activo').notNull().default(true),
  ...auditoriaFechas,
}, (tabla) => [
  index('clientes_fase1_org_nombre_idx').on(tabla.organizacionId, tabla.nombre),
  uniqueIndex('clientes_fase1_org_nit_ci_uq').on(tabla.organizacionId, tabla.nitCi),
  check('clientes_fase1_limite_credito_ck', sql`${tabla.limiteCredito} >= 0`),
]);

export const almacenes = pgTable('almacenes', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizacionId: uuid('organizacion_id').notNull().references(() => organizaciones.id),
  codigo: varchar('codigo', { length: 20 }).notNull(),
  nombre: varchar('nombre', { length: 120 }).notNull(),
  direccion: text('direccion'),
  activo: boolean('activo').notNull().default(true),
  ...auditoriaFechas,
}, (tabla) => [uniqueIndex('almacenes_org_codigo_uq').on(tabla.organizacionId, tabla.codigo)]);

export const existenciasAlmacen = pgTable('existencias_almacen', {
  organizacionId: uuid('organizacion_id').notNull().references(() => organizaciones.id),
  almacenId: uuid('almacen_id').notNull().references(() => almacenes.id),
  productoId: uuid('producto_id').notNull().references(() => productos.id),
  cantidad: numeric('cantidad', { precision: 14, scale: 3 }).notNull().default('0'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (tabla) => [
  primaryKey({ columns: [tabla.almacenId, tabla.productoId] }),
  index('existencias_almacen_org_idx').on(tabla.organizacionId),
]);

export const lotesProducto = pgTable('lotes_producto', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizacionId: uuid('organizacion_id').notNull().references(() => organizaciones.id),
  productoId: uuid('producto_id').notNull().references(() => productos.id),
  almacenId: uuid('almacen_id').notNull().references(() => almacenes.id),
  numeroLote: varchar('numero_lote', { length: 80 }).notNull(),
  fechaVencimiento: date('fecha_vencimiento'),
  cantidadInicial: numeric('cantidad_inicial', { precision: 14, scale: 3 }).notNull(),
  cantidadActual: numeric('cantidad_actual', { precision: 14, scale: 3 }).notNull(),
  cantidadReservada: numeric('cantidad_reservada', { precision: 14, scale: 3 }).notNull().default('0'),
  estado: varchar('estado', { length: 16 }).notNull().default('available'),
  ubicacion: varchar('ubicacion', { length: 120 }),
  costoUnitario: numeric('costo_unitario', { precision: 14, scale: 4 }).notNull().default('0'),
  proveedorId: uuid('proveedor_id').references(() => proveedores.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (tabla) => [
  uniqueIndex('lotes_producto_almacen_numero_uq').on(tabla.productoId, tabla.almacenId, tabla.numeroLote),
  index('lotes_producto_vencimiento_idx').on(tabla.fechaVencimiento),
  check('lotes_producto_cantidades_ck', sql`${tabla.cantidadInicial} > 0 AND ${tabla.cantidadActual} >= 0`),
]);

export const compras = pgTable('compras', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizacionId: uuid('organizacion_id').notNull().references(() => organizaciones.id),
  almacenId: uuid('almacen_id').notNull().references(() => almacenes.id),
  numeroFactura: varchar('numero_factura', { length: 60 }).notNull(),
  proveedorId: uuid('proveedor_id').notNull().references(() => proveedores.id),
  fecha: timestamp('fecha', { withTimezone: true }).notNull().defaultNow(),
  subtotal: numeric('subtotal', { precision: 12, scale: 2 }).notNull().default('0'),
  impuestos: numeric('impuestos', { precision: 12, scale: 2 }).notNull().default('0'),
  total: numeric('total', { precision: 12, scale: 2 }).notNull().default('0'),
  estado: estadoCompraEnum('estado').notNull().default('borrador'),
  observaciones: text('observaciones'),
  usuarioId: uuid('usuario_id').notNull().references(() => usuarios.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (tabla) => [
  uniqueIndex('compras_org_numero_factura_uq').on(tabla.organizacionId, tabla.numeroFactura),
  index('compras_org_fecha_idx').on(tabla.organizacionId, tabla.fecha),
  check('compras_totales_ck', sql`${tabla.subtotal} >= 0 AND ${tabla.impuestos} >= 0 AND ${tabla.total} >= 0`),
]);

export const detalleCompra = pgTable('detalle_compra', {
  id: uuid('id').primaryKey().defaultRandom(),
  compraId: uuid('compra_id').notNull().references(() => compras.id, { onDelete: 'cascade' }),
  productoId: uuid('producto_id').notNull().references(() => productos.id),
  cantidad: numeric('cantidad', { precision: 14, scale: 3 }).notNull(),
  precioUnitario: numeric('precio_unitario', { precision: 12, scale: 2 }).notNull(),
  subtotal: numeric('subtotal', { precision: 12, scale: 2 }).notNull(),
  lote: varchar('lote', { length: 80 }),
  fechaVencimiento: date('fecha_vencimiento'),
}, (tabla) => [
  index('detalle_compra_compra_idx').on(tabla.compraId),
  check('detalle_compra_valores_ck', sql`${tabla.cantidad} > 0 AND ${tabla.precioUnitario} >= 0 AND ${tabla.subtotal} >= 0`),
]);

export const ventas = pgTable('ventas', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizacionId: uuid('organizacion_id').notNull().references(() => organizaciones.id),
  almacenId: uuid('almacen_id').notNull().references(() => almacenes.id),
  numeroFactura: varchar('numero_factura', { length: 60 }).notNull(),
  clienteId: uuid('cliente_id').references(() => clientes.id),
  fecha: timestamp('fecha', { withTimezone: true }).notNull().defaultNow(),
  subtotal: numeric('subtotal', { precision: 12, scale: 2 }).notNull().default('0'),
  descuento: numeric('descuento', { precision: 12, scale: 2 }).notNull().default('0'),
  impuestos: numeric('impuestos', { precision: 12, scale: 2 }).notNull().default('0'),
  total: numeric('total', { precision: 12, scale: 2 }).notNull().default('0'),
  tipoPago: tipoPagoVentaEnum('tipo_pago').notNull().default('contado'),
  estado: estadoVentaEnum('estado').notNull().default('borrador'),
  parcelaId: uuid('parcela_id'),
  cicloCultivoId: uuid('ciclo_cultivo_id'),
  actividadCampoId: uuid('actividad_campo_id'),
  campaniaId: uuid('campania_id'),
  numeroReceta: varchar('numero_receta', { length: 100 }),
  ordenServicioId: uuid('orden_servicio_id'),
  observaciones: text('observaciones'),
  usuarioId: uuid('usuario_id').notNull().references(() => usuarios.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (tabla) => [
  uniqueIndex('ventas_fase1_org_numero_factura_uq').on(tabla.organizacionId, tabla.numeroFactura),
  index('ventas_fase1_org_fecha_idx').on(tabla.organizacionId, tabla.fecha),
  check('ventas_fase1_totales_ck', sql`${tabla.subtotal} >= 0 AND ${tabla.descuento} >= 0 AND ${tabla.impuestos} >= 0 AND ${tabla.total} >= 0`),
]);

export const detalleVenta = pgTable('detalle_venta', {
  id: uuid('id').primaryKey().defaultRandom(),
  ventaId: uuid('venta_id').notNull().references(() => ventas.id, { onDelete: 'cascade' }),
  productoId: uuid('producto_id').notNull().references(() => productos.id),
  loteProductoId: uuid('lote_producto_id').references(() => lotesProducto.id),
  cantidad: numeric('cantidad', { precision: 14, scale: 3 }).notNull(),
  precioUnitario: numeric('precio_unitario', { precision: 12, scale: 2 }).notNull(),
  descuento: numeric('descuento', { precision: 12, scale: 2 }).notNull().default('0'),
  subtotal: numeric('subtotal', { precision: 12, scale: 2 }).notNull(),
}, (tabla) => [
  index('detalle_venta_venta_idx').on(tabla.ventaId),
  check('detalle_venta_valores_ck', sql`${tabla.cantidad} > 0 AND ${tabla.precioUnitario} >= 0 AND ${tabla.descuento} >= 0 AND ${tabla.subtotal} >= 0`),
]);

export const pagosVenta = pgTable('pagos_venta', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizacionId: uuid('organizacion_id').notNull().references(() => organizaciones.id),
  ventaId: uuid('venta_id').notNull().references(() => ventas.id),
  fecha: timestamp('fecha', { withTimezone: true }).notNull().defaultNow(),
  monto: numeric('monto', { precision: 12, scale: 2 }).notNull(),
  metodoPago: metodoPagoEnum('metodo_pago').notNull(),
  referencia: varchar('referencia', { length: 120 }),
  usuarioId: uuid('usuario_id').notNull().references(() => usuarios.id),
}, (tabla) => [
  index('pagos_venta_venta_idx').on(tabla.ventaId),
  check('pagos_venta_monto_ck', sql`${tabla.monto} > 0`),
]);

export const movimientosInventario = pgTable('movimientos_inventario', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizacionId: uuid('organizacion_id').notNull().references(() => organizaciones.id),
  productoId: uuid('producto_id').notNull().references(() => productos.id),
  almacenId: uuid('almacen_id').notNull().references(() => almacenes.id),
  almacenDestinoId: uuid('almacen_destino_id').references(() => almacenes.id),
  loteProductoId: uuid('lote_producto_id').references(() => lotesProducto.id),
  tipo: tipoMovimientoEnum('tipo').notNull(),
  cantidad: numeric('cantidad', { precision: 14, scale: 3 }).notNull(),
  stockAnterior: numeric('stock_anterior', { precision: 14, scale: 3 }).notNull(),
  stockNuevo: numeric('stock_nuevo', { precision: 14, scale: 3 }).notNull(),
  motivo: text('motivo').notNull(),
  referenciaTipo: varchar('referencia_tipo', { length: 50 }).notNull(),
  referenciaId: uuid('referencia_id'),
  parcelaId: uuid('parcela_id'),
  cicloCultivoId: uuid('ciclo_cultivo_id'),
  actividadCampoId: uuid('actividad_campo_id'),
  campaniaId: uuid('campania_id'),
  ordenTrabajoId: uuid('orden_trabajo_id'),
  clienteId: uuid('cliente_id').references(() => clientes.id),
  costoUnitario: numeric('costo_unitario', { precision: 14, scale: 4 }).notNull().default('0'),
  valorMovimiento: numeric('valor_movimiento', { precision: 14, scale: 2 }).notNull().default('0'),
  usuarioId: uuid('usuario_id').notNull().references(() => usuarios.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (tabla) => [
  index('movimientos_inventario_fase1_producto_fecha_idx').on(tabla.organizacionId, tabla.productoId, tabla.createdAt),
  index('movimientos_inventario_fase1_referencia_idx').on(tabla.referenciaTipo, tabla.referenciaId),
  index('movimientos_inventario_fase1_parcela_idx').on(tabla.parcelaId),
  check('movimientos_inventario_fase1_cantidad_ck', sql`${tabla.cantidad} > 0`),
]);

export const auditoria = pgTable('auditoria', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizacionId: uuid('organizacion_id').notNull().references(() => organizaciones.id),
  usuarioId: uuid('usuario_id').references(() => usuarios.id),
  accion: varchar('accion', { length: 40 }).notNull(),
  tablaAfectada: varchar('tabla_afectada', { length: 80 }).notNull(),
  registroId: uuid('registro_id'),
  datosAnteriores: jsonb('datos_anteriores'),
  datosNuevos: jsonb('datos_nuevos'),
  ip: inet('ip'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (tabla) => [
  index('auditoria_org_fecha_idx').on(tabla.organizacionId, tabla.createdAt),
  index('auditoria_registro_idx').on(tabla.tablaAfectada, tabla.registroId),
]);

export const secuenciasDocumento = pgTable('secuencias_documento', {
  organizacionId: uuid('organizacion_id').notNull().references(() => organizaciones.id),
  tipoDocumento: varchar('tipo_documento', { length: 30 }).notNull(),
  gestion: integer('gestion').notNull(),
  valorActual: integer('valor_actual').notNull().default(0),
}, (tabla) => [primaryKey({ columns: [tabla.organizacionId, tabla.tipoDocumento, tabla.gestion] })]);

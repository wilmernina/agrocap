import { customType, pgEnum, pgTable, uuid, varchar, text, numeric, integer, boolean, date, timestamp, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { organizaciones, usuarios, productos, almacenes } from './schema-fase1.ts';

const geometriaPoligono = customType<{ data: string; driverData: string }>({ dataType: () => 'geometry(Polygon, 4326)' });
const geometriaPunto = customType<{ data: string; driverData: string }>({ dataType: () => 'geometry(Point, 4326)' });

export const tipoCultivoEnum = pgEnum('tipo_cultivo', ['granos', 'hortalizas', 'frutales', 'forrajes', 'otros']);
export const tipoPuntoInteresEnum = pgEnum('tipo_punto_interes', ['pozo', 'bomba', 'bodega', 'casa', 'punto_muestreo']);
export const estadoCicloCultivoEnum = pgEnum('estado_ciclo_cultivo', ['planificado', 'en_curso', 'cosechado', 'perdido']);
export const tipoActividadCampoEnum = pgEnum('tipo_actividad_campo', ['siembra', 'riego', 'fertilizacion', 'fumigacion', 'poda', 'cosecha', 'muestreo', 'otro']);
export const severidadPlagaEnum = pgEnum('severidad_plaga', ['baja', 'media', 'alta', 'critica']);
export const fuenteSatelitalEnum = pgEnum('fuente_satelital', ['sentinel-2', 'landsat', 'planet']);
export const indiceSatelitalEnum = pgEnum('indice_satelital', ['NDVI', 'NDWI', 'EVI']);

const fechasAuditoria = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
};

export const fincas = pgTable('fincas', {
  id: uuid('id').primaryKey().defaultRandom(), organizacionId: uuid('organizacion_id').notNull().references(() => organizaciones.id),
  nombre: varchar('nombre', { length: 160 }).notNull(), propietarioId: uuid('propietario_id').references(() => usuarios.id, { onDelete: 'set null' }),
  direccion: text('direccion'), municipio: varchar('municipio', { length: 120 }), departamento: varchar('departamento', { length: 120 }),
  superficieTotal: numeric('superficie_total', { precision: 14, scale: 2 }).notNull().default('0'), activo: boolean('activo').notNull().default(true), ...fechasAuditoria,
}, (t) => [uniqueIndex('fincas_org_nombre_uq').on(t.organizacionId, t.nombre), index('fincas_org_idx').on(t.organizacionId)]);

export const parcelas = pgTable('parcelas', {
  id: uuid('id').primaryKey().defaultRandom(), organizacionId: uuid('organizacion_id').notNull().references(() => organizaciones.id),
  fincaId: uuid('finca_id').notNull().references(() => fincas.id), nombre: varchar('nombre', { length: 160 }).notNull(),
  codigo: varchar('codigo', { length: 60 }).notNull(), geometria: geometriaPoligono('geometria').notNull(),
  superficieCalculada: numeric('superficie_calculada', { precision: 14, scale: 2 }).notNull().default('0'), tipoSuelo: varchar('tipo_suelo', { length: 120 }),
  altitud: numeric('altitud', { precision: 9, scale: 2 }), pendiente: numeric('pendiente', { precision: 7, scale: 3 }),
  sistemaRiego: varchar('sistema_riego', { length: 120 }), observaciones: text('observaciones'), activo: boolean('activo').notNull().default(true), ...fechasAuditoria,
}, (t) => [uniqueIndex('parcelas_org_codigo_uq').on(t.organizacionId, t.codigo), index('parcelas_org_finca_idx').on(t.organizacionId, t.fincaId), index('parcelas_geometria_gist_idx').using('gist', t.geometria)]);

export const lotesParcela = pgTable('lotes_parcela', {
  id: uuid('id').primaryKey().defaultRandom(), organizacionId: uuid('organizacion_id').notNull().references(() => organizaciones.id),
  parcelaId: uuid('parcela_id').notNull().references(() => parcelas.id, { onDelete: 'cascade' }), nombre: varchar('nombre', { length: 120 }).notNull(),
  geometria: geometriaPoligono('geometria').notNull(), superficie: numeric('superficie', { precision: 14, scale: 2 }).notNull().default('0'),
  activo: boolean('activo').notNull().default(true), ...fechasAuditoria,
}, (t) => [index('lotes_parcela_parcela_idx').on(t.organizacionId, t.parcelaId), index('lotes_parcela_geometria_gist_idx').using('gist', t.geometria)]);

export const puntosInteres = pgTable('puntos_interes', {
  id: uuid('id').primaryKey().defaultRandom(), organizacionId: uuid('organizacion_id').notNull().references(() => organizaciones.id),
  parcelaId: uuid('parcela_id').references(() => parcelas.id, { onDelete: 'set null' }), fincaId: uuid('finca_id').notNull().references(() => fincas.id, { onDelete: 'cascade' }),
  nombre: varchar('nombre', { length: 160 }).notNull(), tipo: tipoPuntoInteresEnum('tipo').notNull(), geometria: geometriaPunto('geometria').notNull(),
  descripcion: text('descripcion'), ...fechasAuditoria,
}, (t) => [index('puntos_interes_finca_idx').on(t.organizacionId, t.fincaId), index('puntos_interes_geometria_gist_idx').using('gist', t.geometria)]);

export const cultivos = pgTable('cultivos', {
  id: uuid('id').primaryKey().defaultRandom(), organizacionId: uuid('organizacion_id').notNull().references(() => organizaciones.id),
  nombreComun: varchar('nombre_comun', { length: 120 }).notNull(), nombreCientifico: varchar('nombre_cientifico', { length: 180 }),
  variedad: varchar('variedad', { length: 120 }), tipo: tipoCultivoEnum('tipo').notNull().default('otros'), cicloDias: integer('ciclo_dias'),
  activo: boolean('activo').notNull().default(true), ...fechasAuditoria,
}, (t) => [uniqueIndex('cultivos_org_nombre_variedad_uq').on(t.organizacionId, t.nombreComun, t.variedad), index('cultivos_org_idx').on(t.organizacionId, t.activo)]);

export const ciclosCultivo = pgTable('ciclos_cultivo', {
  id: uuid('id').primaryKey().defaultRandom(), organizacionId: uuid('organizacion_id').notNull().references(() => organizaciones.id),
  parcelaId: uuid('parcela_id').notNull().references(() => parcelas.id), cultivoId: uuid('cultivo_id').notNull().references(() => cultivos.id),
  fechaSiembra: date('fecha_siembra').notNull(), fechaCosechaEstimada: date('fecha_cosecha_estimada'), fechaCosechaReal: date('fecha_cosecha_real'),
  estado: estadoCicloCultivoEnum('estado').notNull().default('planificado'), rendimientoEstimado: numeric('rendimiento_estimado', { precision: 14, scale: 3 }),
  rendimientoReal: numeric('rendimiento_real', { precision: 14, scale: 3 }), unidadRendimiento: varchar('unidad_rendimiento', { length: 24 }),
  observaciones: text('observaciones'), ...fechasAuditoria,
}, (t) => [index('ciclos_cultivo_parcela_fecha_idx').on(t.organizacionId, t.parcelaId, t.fechaSiembra), index('ciclos_cultivo_estado_idx').on(t.organizacionId, t.estado)]);

export const actividadesCampo = pgTable('actividades_campo', {
  id: uuid('id').primaryKey().defaultRandom(), organizacionId: uuid('organizacion_id').notNull().references(() => organizaciones.id),
  cicloCultivoId: uuid('ciclo_cultivo_id').references(() => ciclosCultivo.id, { onDelete: 'set null' }), parcelaId: uuid('parcela_id').notNull().references(() => parcelas.id),
  tipo: tipoActividadCampoEnum('tipo').notNull(), fecha: timestamp('fecha', { withTimezone: true }).notNull(), descripcion: text('descripcion').notNull(),
  usuarioId: uuid('usuario_id').references(() => usuarios.id, { onDelete: 'set null' }), costoTotal: numeric('costo_total', { precision: 14, scale: 2 }).notNull().default('0'),
  productoId: uuid('producto_id').references(() => productos.id, { onDelete: 'set null' }), cantidadProducto: numeric('cantidad_producto', { precision: 14, scale: 3 }),
  almacenId: uuid('almacen_id').references(() => almacenes.id), costoProductoUnitario: numeric('costo_producto_unitario', { precision: 14, scale: 2 }),
  clima: jsonb('clima').$type<{ temp?: number; humedad?: number; viento?: number }>().notNull().default(sql`'{}'::jsonb`), ...fechasAuditoria,
}, (t) => [index('actividades_campo_parcela_fecha_idx').on(t.organizacionId, t.parcelaId, t.fecha), index('actividades_campo_ciclo_idx').on(t.cicloCultivoId, t.fecha), index('actividades_campo_producto_idx').on(t.productoId), index('actividades_campo_almacen_idx').on(t.organizacionId, t.almacenId)]);

export const monitoreoPlagas = pgTable('monitoreo_plagas', {
  id: uuid('id').primaryKey().defaultRandom(), organizacionId: uuid('organizacion_id').notNull().references(() => organizaciones.id),
  cicloCultivoId: uuid('ciclo_cultivo_id').references(() => ciclosCultivo.id, { onDelete: 'set null' }), parcelaId: uuid('parcela_id').notNull().references(() => parcelas.id),
  fecha: timestamp('fecha', { withTimezone: true }).notNull(), plagaEnfermedad: varchar('plaga_enfermedad', { length: 180 }).notNull(),
  severidad: severidadPlagaEnum('severidad').notNull(), incidenciaPorcentaje: numeric('incidencia_porcentaje', { precision: 5, scale: 2 }).notNull().default('0'),
  accionTomada: text('accion_tomada'), productoAplicado: varchar('producto_aplicado', { length: 180 }), usuarioId: uuid('usuario_id').references(() => usuarios.id, { onDelete: 'set null' }),
  observaciones: text('observaciones'), ...fechasAuditoria,
}, (t) => [index('monitoreo_plagas_alertas_idx').on(t.organizacionId, t.fecha, t.severidad), index('monitoreo_plagas_parcela_idx').on(t.parcelaId, t.fecha)]);

export const fotosCampo = pgTable('fotos_campo', {
  id: uuid('id').primaryKey().defaultRandom(), organizacionId: uuid('organizacion_id').notNull().references(() => organizaciones.id),
  parcelaId: uuid('parcela_id').notNull().references(() => parcelas.id), cicloCultivoId: uuid('ciclo_cultivo_id').references(() => ciclosCultivo.id, { onDelete: 'set null' }),
  actividadId: uuid('actividad_id').references(() => actividadesCampo.id, { onDelete: 'set null' }), archivoUrl: text('archivo_url').notNull(), archivoThumbUrl: text('archivo_thumb_url').notNull(),
  latitud: numeric('latitud', { precision: 10, scale: 7 }).notNull(), longitud: numeric('longitud', { precision: 10, scale: 7 }).notNull(),
  ubicacion: geometriaPunto('ubicacion').generatedAlwaysAs(sql`ST_SetSRID(ST_MakePoint(longitud::double precision, latitud::double precision), 4326)`),
  altitud: numeric('altitud', { precision: 9, scale: 2 }), precisionGps: numeric('precision_gps', { precision: 9, scale: 2 }), direccionFoto: numeric('direccion_foto', { precision: 6, scale: 2 }),
  fechaCaptura: timestamp('fecha_captura', { withTimezone: true }), usuarioId: uuid('usuario_id').references(() => usuarios.id, { onDelete: 'set null' }),
  descripcion: text('descripcion'), etiquetas: jsonb('etiquetas').$type<string[]>().notNull().default(sql`'[]'::jsonb`), ...fechasAuditoria,
}, (t) => [index('fotos_campo_parcela_fecha_idx').on(t.organizacionId, t.parcelaId, t.createdAt), index('fotos_campo_ubicacion_gist_idx').using('gist', t.ubicacion)]);

export const indicesSatelitales = pgTable('indices_satelitales', {
  id: uuid('id').primaryKey().defaultRandom(), organizacionId: uuid('organizacion_id').notNull().references(() => organizaciones.id),
  parcelaId: uuid('parcela_id').notNull().references(() => parcelas.id, { onDelete: 'cascade' }), fecha: date('fecha').notNull(),
  fuente: fuenteSatelitalEnum('fuente').notNull(), indice: indiceSatelitalEnum('indice').notNull(), valorPromedio: numeric('valor_promedio', { precision: 8, scale: 5 }).notNull(),
  urlTile: text('url_tile'), nubosidad: numeric('nubosidad', { precision: 5, scale: 2 }), createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex('indices_satelitales_parcela_fecha_fuente_indice_uq').on(t.parcelaId, t.fecha, t.fuente, t.indice), index('indices_satelitales_parcela_fecha_idx').on(t.organizacionId, t.parcelaId, t.fecha)]);

import { z } from 'zod';
import { consultaPaginadaSchema } from '../../shared/consultas.ts';
import { moneySchema, optionalText, quantitySchema } from '../../shared/schemas.ts';

const texto = (max: number) => z.string().trim().min(1).max(max);
const jsonEtiquetas = z.preprocess((valor) => {
  if (typeof valor !== 'string') return valor;
  try { return JSON.parse(valor) as unknown; } catch { return valor.split(',').map((s) => s.trim()).filter(Boolean); }
}, z.array(z.string().trim().min(1).max(40)).max(30).default([]));

export const cultivoSchema = z.object({
  nombreComun: texto(120), nombreCientifico: optionalText(180), variedad: optionalText(120),
  tipo: z.enum(['granos', 'hortalizas', 'frutales', 'forrajes', 'otros']).default('otros'),
  cicloDias: z.number().int().positive().max(2000).optional().nullable(), activo: z.boolean().default(true),
});
export const actualizarCultivoSchema = cultivoSchema.partial().refine((v) => Object.keys(v).length > 0, 'Debe enviar al menos un campo');
export const consultaCultivosSchema = consultaPaginadaSchema.extend({ tipo: cultivoSchema.shape.tipo.optional() });

const cicloBaseSchema = z.object({
  parcelaId: z.uuid(), cultivoId: z.uuid(), fechaSiembra: z.iso.date(), fechaCosechaEstimada: z.iso.date().optional().nullable(),
  estado: z.enum(['planificado', 'en_curso', 'cosechado', 'perdido']).default('planificado'),
  rendimientoEstimado: z.number().min(0).optional().nullable(), unidadRendimiento: optionalText(24), observaciones: optionalText(5000),
});
export const cicloSchema = cicloBaseSchema.refine((v) => !v.fechaCosechaEstimada || v.fechaCosechaEstimada >= v.fechaSiembra, { path: ['fechaCosechaEstimada'], message: 'La cosecha estimada debe ser posterior a la siembra' });
export const actualizarCicloSchema = cicloBaseSchema.partial().refine((v) => Object.keys(v).length > 0, 'Debe enviar al menos un campo');
export const cosechaSchema = z.object({ rendimientoReal: z.number().min(0), fechaCosechaReal: z.iso.date().optional(), observaciones: optionalText(5000) });
export const consultaCiclosSchema = consultaPaginadaSchema.extend({ parcela: z.uuid().optional(), cultivo: z.uuid().optional(), estado: cicloSchema.shape.estado.optional() });

const actividadCamposSchema = z.object({
  cicloCultivoId: z.uuid().optional().nullable(), parcelaId: z.uuid(), tipo: z.enum(['siembra', 'riego', 'fertilizacion', 'fumigacion', 'poda', 'cosecha', 'muestreo', 'otro']),
  fecha: z.coerce.date(), descripcion: texto(5000), costoTotal: moneySchema.default(0), productoId: z.uuid().optional().nullable(),
  cantidadProducto: quantitySchema.optional().nullable(), almacenId: z.uuid().optional().nullable(),
  clima: z.object({ temp: z.number().optional(), humedad: z.number().min(0).max(100).optional(), viento: z.number().min(0).optional() }).default({}),
});
export const actividadSchema = actividadCamposSchema.refine((v) => Boolean(v.productoId) === (v.cantidadProducto !== undefined && v.cantidadProducto !== null), { path: ['productoId'], message: 'Producto y cantidad deben enviarse juntos' })
  .refine((v) => !v.almacenId || Boolean(v.productoId), { path: ['almacenId'], message: 'El almacén solo aplica cuando se consume un producto' });
export const actualizarActividadSchema = actividadCamposSchema.partial().refine((v) => Object.keys(v).length > 0, 'Debe enviar al menos un campo');
export const consultaActividadesSchema = consultaPaginadaSchema.extend({ parcela: z.uuid().optional(), tipo: actividadSchema.shape.tipo.optional(), desde: z.coerce.date().optional(), hasta: z.coerce.date().optional() });

export const monitoreoSchema = z.object({
  cicloCultivoId: z.uuid().optional().nullable(), parcelaId: z.uuid(), fecha: z.coerce.date(), plagaEnfermedad: texto(180),
  severidad: z.enum(['baja', 'media', 'alta', 'critica']), incidenciaPorcentaje: z.number().min(0).max(100).default(0),
  accionTomada: optionalText(3000), productoAplicado: optionalText(180), observaciones: optionalText(5000),
});
export const actualizarMonitoreoSchema = monitoreoSchema.partial().refine((v) => Object.keys(v).length > 0, 'Debe enviar al menos un campo');
export const consultaMonitoreoSchema = consultaPaginadaSchema.omit({ busqueda: true, activo: true }).extend({ parcela: z.uuid().optional(), severidad: monitoreoSchema.shape.severidad.optional(), desde: z.coerce.date().optional(), hasta: z.coerce.date().optional() });

export const fotoCampoSchema = z.object({
  parcelaId: z.uuid(), cicloCultivoId: z.uuid().optional().nullable(), actividadId: z.uuid().optional().nullable(),
  latitud: z.coerce.number().min(-90).max(90), longitud: z.coerce.number().min(-180).max(180),
  altitud: z.preprocess((v) => v === '' || v === undefined ? undefined : v, z.coerce.number().min(-500).max(9000).optional()),
  precisionGps: z.preprocess((v) => v === '' || v === undefined ? undefined : v, z.coerce.number().min(0).optional()),
  direccionFoto: z.preprocess((v) => v === '' || v === undefined ? undefined : v, z.coerce.number().min(0).max(360).optional()),
  fechaCaptura: z.preprocess((v) => v === '' || v === undefined ? undefined : v, z.coerce.date().optional()),
  descripcion: z.preprocess((v) => v === '' ? undefined : v, optionalText(2000)), etiquetas: jsonEtiquetas,
});
export const consultaFotosSchema = consultaPaginadaSchema.omit({ busqueda: true, activo: true }).extend({ parcela: z.uuid().optional(), desde: z.coerce.date().optional(), hasta: z.coerce.date().optional() });

export type CultivoInput = z.infer<typeof cultivoSchema>;
export type ActualizarCultivoInput = z.infer<typeof actualizarCultivoSchema>;
export type ConsultaCultivos = z.infer<typeof consultaCultivosSchema>;
export type CicloInput = z.infer<typeof cicloSchema>;
export type ActualizarCicloInput = z.infer<typeof actualizarCicloSchema>;
export type ConsultaCiclos = z.infer<typeof consultaCiclosSchema>;
export type ActividadInput = z.infer<typeof actividadSchema>;
export type ActualizarActividadInput = z.infer<typeof actualizarActividadSchema>;
export type ConsultaActividades = z.infer<typeof consultaActividadesSchema>;
export type MonitoreoInput = z.infer<typeof monitoreoSchema>;
export type ActualizarMonitoreoInput = z.infer<typeof actualizarMonitoreoSchema>;
export type ConsultaMonitoreo = z.infer<typeof consultaMonitoreoSchema>;
export type FotoCampoInput = z.infer<typeof fotoCampoSchema>;
export type ConsultaFotos = z.infer<typeof consultaFotosSchema>;

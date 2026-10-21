import { z } from 'zod';
import { booleanoQuery, consultaPaginadaSchema } from '../../shared/consultas.ts';
import { optionalText } from '../../shared/schemas.ts';

const posicion = z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]);
export const poligonoGeoJsonSchema = z.object({
  type: z.literal('Polygon'),
  coordinates: z.array(z.array(posicion).min(4)).min(1),
});
export const puntoGeoJsonSchema = z.object({ type: z.literal('Point'), coordinates: posicion });

export const fincaSchema = z.object({
  nombre: z.string().trim().min(2).max(160), propietarioId: z.uuid().optional().nullable(),
  direccion: optionalText(1000), municipio: optionalText(120), departamento: optionalText(120), activo: z.boolean().default(true),
});
export const actualizarFincaSchema = fincaSchema.partial().refine((datos) => Object.keys(datos).length > 0, 'Debe enviar al menos un campo');
export const consultaFincasSchema = consultaPaginadaSchema;

export const parcelaSchema = z.object({
  fincaId: z.uuid(), nombre: z.string().trim().min(2).max(160), codigo: z.string().trim().min(1).max(60),
  geometria: poligonoGeoJsonSchema, tipoSuelo: optionalText(120), altitud: z.number().min(-500).max(9000).optional().nullable(),
  pendiente: z.number().min(0).max(90).optional().nullable(), sistemaRiego: optionalText(120), observaciones: optionalText(5000), activo: z.boolean().default(true),
});
export const actualizarParcelaSchema = parcelaSchema.partial().refine((datos) => Object.keys(datos).length > 0, 'Debe enviar al menos un campo');
export const consultaParcelasSchema = consultaPaginadaSchema.extend({ finca: z.uuid().optional(), cultivo_actual: z.uuid().optional() });
export const consultaGeoJsonSchema = z.object({ finca: z.uuid().optional(), activo: booleanoQuery });

export const loteParcelaSchema = z.object({
  parcelaId: z.uuid(), nombre: z.string().trim().min(1).max(120), geometria: poligonoGeoJsonSchema, activo: z.boolean().default(true),
});
export const actualizarLoteParcelaSchema = loteParcelaSchema.omit({ parcelaId: true }).partial().refine((datos) => Object.keys(datos).length > 0, 'Debe enviar al menos un campo');

export const puntoInteresSchema = z.object({
  fincaId: z.uuid(), parcelaId: z.uuid().optional().nullable(), nombre: z.string().trim().min(1).max(160),
  tipo: z.enum(['pozo', 'bomba', 'bodega', 'casa', 'punto_muestreo']), geometria: puntoGeoJsonSchema, descripcion: optionalText(2000),
});
export const actualizarPuntoInteresSchema = puntoInteresSchema.omit({ fincaId: true }).partial().refine((datos) => Object.keys(datos).length > 0, 'Debe enviar al menos un campo');

export type FincaInput = z.infer<typeof fincaSchema>;
export type ActualizarFincaInput = z.infer<typeof actualizarFincaSchema>;
export type ConsultaFincas = z.infer<typeof consultaFincasSchema>;
export type ParcelaInput = z.infer<typeof parcelaSchema>;
export type ActualizarParcelaInput = z.infer<typeof actualizarParcelaSchema>;
export type ConsultaParcelas = z.infer<typeof consultaParcelasSchema>;
export type ConsultaGeoJson = z.infer<typeof consultaGeoJsonSchema>;
export type LoteParcelaInput = z.infer<typeof loteParcelaSchema>;
export type ActualizarLoteParcelaInput = z.infer<typeof actualizarLoteParcelaSchema>;
export type PuntoInteresInput = z.infer<typeof puntoInteresSchema>;
export type ActualizarPuntoInteresInput = z.infer<typeof actualizarPuntoInteresSchema>;

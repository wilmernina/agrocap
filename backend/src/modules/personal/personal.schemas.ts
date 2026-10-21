import { z } from 'zod';
import { consultaPaginadaSchema } from '../../shared/consultas.ts';
import { optionalText } from '../../shared/schemas.ts';

const dinero = z.coerce.number().finite().min(0).max(999999999).transform(n => n.toFixed(2));
const porcentaje = z.coerce.number().finite().min(0).max(100).transform(n => n.toFixed(3));
const fecha = z.iso.date();
const texto = (max: number) => z.string().trim().min(1).max(max);

const empleadoBaseSchema = z.object({
  usuarioId: z.uuid().optional().nullable(), codigo: texto(40), nombres: texto(120), apellidos: texto(120), ci: texto(32), ciComplemento: optionalText(8),
  fechaNacimiento: fecha.optional().nullable(), genero: z.enum(['femenino', 'masculino', 'otro', 'no_especificado']).optional().nullable(), telefono: optionalText(40), email: z.email().optional().nullable(), direccion: optionalText(500), ciudad: optionalText(100),
  cargo: z.enum(['capataz', 'peon', 'tecnico', 'chofer', 'administrativo', 'otro']).default('otro'), cargoId: z.uuid().optional().nullable(), tipoContrato: z.enum(['permanente', 'eventual', 'temporal']).default('permanente'), fechaIngreso: fecha,
  salarioBase: dinero, tipoPago: z.enum(['mensual', 'jornal', 'destajo']).default('mensual'), valorJornal: dinero.optional().nullable(), banco: optionalText(100), numeroCuenta: optionalText(80), afp: optionalText(100), numeroAfp: optionalText(60), tieneRcIva: z.boolean().default(false), estado: z.enum(['activo', 'inactivo', 'vacacion', 'licencia']).default('activo'), observaciones: optionalText(5000),
});
export const empleadoSchema = empleadoBaseSchema.refine(v => v.tipoPago !== 'jornal' || Number(v.valorJornal ?? 0) > 0, { path: ['valorJornal'], message: 'Indique el valor del jornal' });
export const actualizarEmpleadoSchema = empleadoBaseSchema.partial().refine(v => Object.keys(v).length > 0, 'Debe enviar al menos un campo');
export const consultaEmpleadosSchema = consultaPaginadaSchema.extend({ cargo: empleadoSchema.shape.cargo.optional(), estado: empleadoSchema.shape.estado.optional(), tipoContrato: empleadoSchema.shape.tipoContrato.optional() });
export const bajaEmpleadoSchema = z.object({ fechaBaja: fecha, motivoBaja: texto(1000) });

export const cargoSchema = z.object({ nombre: texto(100), descripcion: optionalText(1000), salarioBaseReferencia: dinero.default('0.00'), activo: z.boolean().default(true) });
export const actualizarCargoSchema = cargoSchema.partial().refine(v => Object.keys(v).length > 0, 'Debe enviar al menos un campo');

const tramoSolidario = z.object({ desde: dinero, hasta: dinero.nullable(), porcentaje });
export const configuracionSchema = z.object({
  gestion: z.number().int().min(2000).max(2200), salarioMinimoNacional: dinero, aporteAfpLaboral: porcentaje, aporteAfpPatronal: porcentaje, comisionAfp: porcentaje, tasaRcIva: porcentaje, umbralAporteSolidario: dinero,
  porcentajeAporteSolidario: z.array(tramoSolidario).default([]), horasMesBase: z.number().int().min(1).max(744).default(240), diasMesBase: z.number().int().min(1).max(31).default(30), recargoHoraExtra: z.coerce.number().min(0).max(10).transform(n => n.toFixed(3)).default('1.000'), recargoNocturno: z.coerce.number().min(0).max(10).transform(n => n.toFixed(3)).default('0.500'), recargoDominical: z.coerce.number().min(0).max(10).transform(n => n.toFixed(3)).default('1.000'), activo: z.boolean().default(true), fuenteNormativa: optionalText(2000),
});
export const actualizarConfiguracionSchema = configuracionSchema.omit({ gestion: true }).partial().refine(v => Object.keys(v).length > 0, 'Debe enviar al menos un campo');

export const feriadoSchema = z.object({ fecha, nombre: texto(160), tipo: z.enum(['nacional', 'departamental', 'regional']).default('nacional'), departamento: optionalText(100).default(null), activo: z.boolean().default(true) });
export const actualizarFeriadoSchema = feriadoSchema.partial().refine(v => Object.keys(v).length > 0, 'Debe enviar al menos un campo');
export const consultaFeriadosSchema = z.object({ gestion: z.coerce.number().int().min(2000).max(2200).optional(), departamento: z.string().trim().max(100).optional(), tipo: feriadoSchema.shape.tipo.optional() });
export const beneficiosQuerySchema = z.object({ fecha: fecha.optional() });
export const aguinaldoQuerySchema = z.object({ gestion: z.coerce.number().int().min(2000).max(2200) });

export type EmpleadoInput = z.infer<typeof empleadoSchema>;
export type ActualizarEmpleadoInput = z.infer<typeof actualizarEmpleadoSchema>;
export type ConsultaEmpleados = z.infer<typeof consultaEmpleadosSchema>;
export type CargoInput = z.infer<typeof cargoSchema>;
export type ConfiguracionInput = z.infer<typeof configuracionSchema>;
export type FeriadoInput = z.infer<typeof feriadoSchema>;

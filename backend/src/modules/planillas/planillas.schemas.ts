import { z } from 'zod';
import { consultaPaginadaSchema } from '../../shared/consultas.ts';
import { optionalText } from '../../shared/schemas.ts';

const dinero = z.coerce.number().finite().min(0).max(999999999).transform(n => n.toFixed(2));
const fecha = z.iso.date();
const concepto = z.object({ concepto: z.string().trim().min(1).max(160), monto: dinero });

export const periodoSchema = z.object({
  tipo: z.enum(['mensual','quincenal']), gestion: z.number().int().min(2000).max(2200), mes: z.number().int().min(1).max(12), quincena: z.number().int().min(1).max(2).optional().nullable(),
  fechaInicio: fecha, fechaFin: fecha, fechaPago: fecha.optional().nullable(),
}).refine(v => v.fechaInicio <= v.fechaFin, { path: ['fechaFin'], message: 'La fecha final debe ser posterior a la fecha inicial' })
  .refine(v => (v.tipo === 'mensual' && !v.quincena) || (v.tipo === 'quincenal' && Boolean(v.quincena)), { path: ['quincena'], message: 'El período mensual no lleva quincena; el quincenal requiere 1 o 2' })
  .refine(v => v.fechaInicio.startsWith(`${v.gestion}-${String(v.mes).padStart(2,'0')}`) && v.fechaFin.startsWith(`${v.gestion}-${String(v.mes).padStart(2,'0')}`), { path: ['mes'], message: 'Las fechas deben pertenecer al mes y gestión indicados' })
  .refine(v => v.tipo !== 'quincenal' || (v.quincena === 1 ? Number(v.fechaInicio.slice(-2)) === 1 && Number(v.fechaFin.slice(-2)) <= 15 : Number(v.fechaInicio.slice(-2)) >= 16), { path: ['quincena'], message: 'Las fechas no corresponden a la quincena indicada' });
export const consultaPeriodosSchema = consultaPaginadaSchema.omit({ busqueda: true, activo: true }).extend({ gestion: z.coerce.number().int().min(2000).max(2200).optional(), estado: z.enum(['abierto','calculado','cerrado','pagado']).optional(), tipo: z.enum(['mensual','quincenal']).optional() });
export const actualizarPlanillaSchema = z.object({
  diasTrabajados: z.coerce.number().min(0).max(31).transform(n => n.toFixed(2)).optional(), montoGanado: dinero.optional(), horasExtraMonto: dinero.optional(), bonoAntiguedad: dinero.optional(), bonoProduccion: dinero.optional(),
  otrosBonos: z.array(concepto).max(50).optional(), otrosDescuentos: z.array(concepto).max(50).optional(), observaciones: optionalText(3000),
}).refine(v => Object.keys(v).length > 0, 'Debe enviar al menos un ajuste');
export const pagarPlanillaSchema = z.object({ metodoPago: z.enum(['efectivo','transferencia','cheque','qr','otro']), fechaPago: fecha.optional(), referenciaPago: optionalText(120) });
export const pagarPeriodoSchema = z.object({ metodoPago: z.enum(['efectivo','transferencia','cheque','qr','otro']), fechaPago: fecha.optional(), referenciaPago: optionalText(120), pagos: z.array(z.object({ planillaId: z.uuid(), metodoPago: z.enum(['efectivo','transferencia','cheque','qr','otro']).optional(), fechaPago: fecha.optional(), referenciaPago: optionalText(120) })).optional() });
export const facturaRcIvaSchema = z.object({ numeroFactura: z.string().trim().min(1).max(80), nitProveedor: optionalText(40), razonSocial: optionalText(180), monto: dinero, fecha, tipo: z.enum(['compras','servicios','alquiler']) });

export type PeriodoInput = z.infer<typeof periodoSchema>;
export type ConsultaPeriodos = z.infer<typeof consultaPeriodosSchema>;
export type ActualizarPlanillaInput = z.infer<typeof actualizarPlanillaSchema>;
export type PagoPlanillaInput = z.infer<typeof pagarPlanillaSchema>;
export type PagoPeriodoInput = z.infer<typeof pagarPeriodoSchema>;
export type FacturaRcIvaInput = z.infer<typeof facturaRcIvaSchema>;

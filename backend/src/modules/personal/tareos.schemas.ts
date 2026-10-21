import { z } from 'zod';
import { consultaPaginadaSchema } from '../../shared/consultas.ts';

const tareoBaseSchema = z.object({ empleadoId: z.uuid(), fecha: z.iso.date(), descripcionTarea: z.string().trim().min(2).max(3000), cantidad: z.coerce.number().positive().max(999999999).transform(n => n.toFixed(3)), unidad: z.string().trim().min(1).max(30), precioUnitario: z.coerce.number().min(0).max(999999999).transform(n => n.toFixed(2)), parcelaId: z.uuid().optional().nullable(), latitud: z.coerce.number().min(-90).max(90).transform(n=>n.toFixed(7)).optional().nullable(), longitud: z.coerce.number().min(-180).max(180).transform(n=>n.toFixed(7)).optional().nullable(), precisionGps: z.coerce.number().min(0).max(100000).transform(n=>n.toFixed(2)).optional().nullable() });
export const tareoSchema = tareoBaseSchema.refine(v => (v.latitud == null) === (v.longitud == null), { path: ['longitud'], message: 'Debe enviar latitud y longitud juntas' });
export const actualizarTareoSchema = tareoBaseSchema.omit({ empleadoId: true, fecha: true }).partial().refine(v => Object.keys(v).length > 0, 'Debe enviar al menos un campo');
export const consultaTareosSchema = consultaPaginadaSchema.omit({ busqueda: true, activo: true }).extend({ empleado: z.uuid().optional(), parcela: z.uuid().optional(), estado: z.enum(['pendiente','aprobado','pagado']).optional(), desde: z.iso.date().optional(), hasta: z.iso.date().optional() });
export type TareoInput = z.infer<typeof tareoSchema>;
export type ActualizarTareoInput = z.infer<typeof actualizarTareoSchema>;
export type ConsultaTareos = z.infer<typeof consultaTareosSchema>;

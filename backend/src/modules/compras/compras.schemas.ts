import { z } from 'zod';
import { consultaPaginadaSchema } from '../../shared/consultas.ts';
import { moneySchema, wholeQuantitySchema } from '../../shared/schemas.ts';

const detalle = z.object({ productoId: z.uuid(), cantidad: wholeQuantitySchema, precioUnitario: moneySchema, lote: z.string().trim().max(80).optional().nullable().transform((v) => v || null), fechaVencimiento: z.coerce.date().optional().nullable() });
const base = z.object({ numeroFactura: z.string().trim().min(1).max(60), proveedorId: z.uuid(), almacenId: z.uuid(), fecha: z.coerce.date().optional(), impuestos: moneySchema.default(0), observaciones: z.string().trim().max(2000).optional().nullable().transform((v) => v || null), items: z.array(detalle).min(1).max(200) });
export const crearCompraSchema = base.extend({ confirmar: z.boolean().default(false) });
export const actualizarCompraSchema = base.partial().extend({ items: z.array(detalle).min(1).max(200).optional() }).refine((v) => Object.keys(v).length > 0, 'Debe enviar al menos un campo');
export const consultaComprasSchema = consultaPaginadaSchema.omit({ activo: true }).extend({ estado: z.enum(['borrador', 'confirmada', 'anulada']).optional(), proveedorId: z.uuid().optional(), desde: z.coerce.date().optional(), hasta: z.coerce.date().optional() });
export type CrearCompraInput = z.infer<typeof crearCompraSchema>; export type ActualizarCompraInput = z.infer<typeof actualizarCompraSchema>; export type ConsultaCompras = z.infer<typeof consultaComprasSchema>;

import { z } from 'zod';
import { consultaPaginadaSchema } from '../../shared/consultas.ts';
import { quantitySchema } from '../../shared/schemas.ts';

export const consultaMovimientosSchema = consultaPaginadaSchema.omit({ busqueda: true, activo: true }).extend({
  productoId: z.uuid().optional(), almacenId: z.uuid().optional(),
  tipo: z.enum(['entrada', 'salida', 'ajuste', 'transferencia', 'devolucion']).optional(),
  desde: z.coerce.date().optional(), hasta: z.coerce.date().optional(),
});
export const ajusteInventarioSchema = z.object({
  productoId: z.uuid(), almacenId: z.uuid(), loteProductoId: z.uuid().optional().nullable(),
  direccion: z.enum(['entrada', 'salida']), cantidad: quantitySchema,
  motivo: z.string().trim().min(3).max(500), parcelaId: z.uuid().optional().nullable(),
});
export type ConsultaMovimientos = z.infer<typeof consultaMovimientosSchema>;
export type AjusteInventarioInput = z.infer<typeof ajusteInventarioSchema>;

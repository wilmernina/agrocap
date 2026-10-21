import { z } from 'zod';
import { booleanoQuery, consultaPaginadaSchema } from '../../shared/consultas.ts';
import { moneySchema } from '../../shared/schemas.ts';

const cantidadNoNegativa = z.coerce.number().min(0).max(999_999_999).refine((valor) => Math.round(valor * 1000) === valor * 1000, 'Máximo 3 decimales');
const productoBase = z.object({
  sku: z.string().trim().min(1).max(60).transform((valor) => valor.toUpperCase()),
  codigoBarras: z.string().trim().max(80).optional().nullable().transform((valor) => valor || null),
  nombre: z.string().trim().min(2).max(160),
  descripcion: z.string().trim().max(2000).optional().nullable().transform((valor) => valor || null),
  categoriaId: z.uuid(),
  unidadMedidaId: z.uuid(),
  tipo: z.enum(['semilla', 'fertilizante', 'herbicida', 'fungicida', 'insecticida', 'herramienta', 'maquinaria', 'otro']),
  precioCosto: moneySchema,
  precioVenta: moneySchema,
  stockMinimo: cantidadNoNegativa.default(0),
  stockMaximo: cantidadNoNegativa.optional().nullable(),
  requiereReceta: z.boolean().default(false),
  activo: z.boolean().default(true),
});

export const crearProductoSchema = productoBase.refine(
  (datos) => datos.stockMaximo == null || datos.stockMaximo >= datos.stockMinimo,
  { path: ['stockMaximo'], message: 'Debe ser mayor o igual al stock mínimo' },
);
export const actualizarProductoSchema = productoBase.partial()
  .refine((datos) => Object.keys(datos).length > 0, 'Debe enviar al menos un campo')
  .refine(
    (datos) => datos.stockMinimo === undefined || datos.stockMaximo == null || datos.stockMaximo >= datos.stockMinimo,
    { path: ['stockMaximo'], message: 'Debe ser mayor o igual al stock mínimo' },
  );
export const consultaProductosSchema = consultaPaginadaSchema.extend({
  categoria: z.uuid().optional(),
  tipo: z.enum(['semilla', 'fertilizante', 'herbicida', 'fungicida', 'insecticida', 'herramienta', 'maquinaria', 'otro']).optional(),
  stock_bajo: booleanoQuery,
});

export type CrearProductoInput = z.infer<typeof crearProductoSchema>;
export type ActualizarProductoInput = z.infer<typeof actualizarProductoSchema>;
export type ConsultaProductos = z.infer<typeof consultaProductosSchema>;

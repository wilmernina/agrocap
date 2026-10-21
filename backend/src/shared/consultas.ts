import { z } from 'zod';

const booleanoQuery = z.preprocess((valor) => {
  if (valor === undefined || valor === '') return undefined;
  if (valor === 'true' || valor === true) return true;
  if (valor === 'false' || valor === false) return false;
  return valor;
}, z.boolean().optional());

export const consultaPaginadaSchema = z.object({
  pagina: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(100).default(20),
  busqueda: z.string().trim().max(100).default(''),
  activo: booleanoQuery,
});

export { booleanoQuery };

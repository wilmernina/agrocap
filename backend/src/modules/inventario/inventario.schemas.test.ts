import test from 'node:test'; import assert from 'node:assert/strict'; import { ajusteInventarioSchema, consultaMovimientosSchema } from './inventario.schemas.ts';
const id='123e4567-e89b-42d3-a456-426614174000';
test('un ajuste exige cantidad positiva y motivo',()=>{assert.equal(ajusteInventarioSchema.safeParse({productoId:id,almacenId:id,direccion:'entrada',cantidad:1.125,motivo:'Conteo físico'}).success,true);assert.equal(ajusteInventarioSchema.safeParse({productoId:id,almacenId:id,direccion:'salida',cantidad:-1,motivo:'x'}).success,false);});
test('los filtros de kardex convierten fechas y paginación',()=>{const q=consultaMovimientosSchema.parse({pagina:'2',desde:'2026-01-01'});assert.equal(q.pagina,2);assert.ok(q.desde instanceof Date);});

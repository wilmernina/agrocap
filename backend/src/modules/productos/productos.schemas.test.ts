import test from 'node:test';
import assert from 'node:assert/strict';
import { consultaProductosSchema, crearProductoSchema } from './productos.schemas.ts';

const productoValido = {
  sku: 'urea-46', nombre: 'Urea granulada 46-0-0',
  categoriaId: '123e4567-e89b-42d3-a456-426614174000',
  unidadMedidaId: '123e4567-e89b-42d3-a456-426614174001',
  tipo: 'fertilizante' as const, precioCosto: 200, precioVenta: 250,
  stockMinimo: 10, stockMaximo: 100,
};

test('normaliza SKU y acepta valores monetarios con dos decimales', () => {
  const resultado = crearProductoSchema.parse(productoValido);
  assert.equal(resultado.sku, 'UREA-46');
  assert.equal(resultado.precioVenta, 250);
});

test('rechaza stock máximo menor al mínimo', () => {
  assert.equal(crearProductoSchema.safeParse({ ...productoValido, stockMinimo: 20, stockMaximo: 10 }).success, false);
});

test('normaliza filtros booleanos y paginación', () => {
  const consulta = consultaProductosSchema.parse({ pagina: '2', limite: '10', stock_bajo: 'true', activo: 'false' });
  assert.deepEqual({ pagina: consulta.pagina, limite: consulta.limite, stockBajo: consulta.stock_bajo, activo: consulta.activo }, { pagina: 2, limite: 10, stockBajo: true, activo: false });
});

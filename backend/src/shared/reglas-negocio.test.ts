import test from 'node:test';
import assert from 'node:assert/strict';
import { AppError, ConflictError } from './errors.ts';
import { calcularNuevoStock, calcularPagoAcumulado, calcularTotalesVenta } from './reglas-negocio.ts';

test('impide vender una cantidad superior al stock disponible', () => {
  assert.throws(() => calcularNuevoStock(10, -11, false), (error: unknown) =>
    error instanceof AppError && error.status === 409 && error.code === 'STOCK_INSUFICIENTE');
  assert.equal(calcularNuevoStock(10, -11, true), -1);
});

test('conserva precisión de tres decimales al modificar stock', () => {
  assert.equal(calcularNuevoStock(10.125, 0.255, false), 10.38);
});

test('calcula subtotal, descuentos, impuestos y total sin errores de coma flotante', () => {
  assert.deepEqual(calcularTotalesVenta([
    { cantidad: 2, precioUnitario: 10.10, descuento: 0.20 },
    { cantidad: 1.5, precioUnitario: 20, descuento: 1 },
  ], 2, 6.44), { subtotal: 49, descuento: 2, impuestos: 6.44, total: 53.44 });
});

test('completa una venta con el pago exacto y rechaza sobrepagos', () => {
  assert.deepEqual(calcularPagoAcumulado(100, 40, 60), { acumulado: 100, completado: true });
  assert.throws(() => calcularPagoAcumulado(100, 90, 10.01), ConflictError);
});

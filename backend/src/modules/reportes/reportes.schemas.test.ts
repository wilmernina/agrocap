import test from 'node:test';
import assert from 'node:assert/strict';
import { periodoSchema, topProductosSchema } from './reportes.schemas.ts';

test('el periodo incluye el día completo indicado como fecha final', () => {
  const periodo = periodoSchema.parse({ desde: '2026-10-01', hasta: '2026-10-13' });
  assert.equal(periodo.desde.toISOString(), '2026-10-01T04:00:00.000Z');
  assert.equal(periodo.hasta.toISOString(), '2026-10-14T03:59:59.999Z');
});

test('limita el ranking de productos a un máximo razonable', () => {
  assert.equal(topProductosSchema.parse({ limite: '5' }).limite, 5);
  assert.equal(topProductosSchema.safeParse({ limite: '101' }).success, false);
});

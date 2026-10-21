import { describe, expect, it } from 'vitest';
import { queryString } from './query-string';

describe('queryString', () => {
  it('conserva paginación y valores booleanos falsos', () => {
    expect(queryString({ pagina: 2, limite: 10, activo: false })).toBe('?pagina=2&limite=10&activo=false');
  });

  it('omite filtros vacíos sin perder el resto', () => {
    expect(queryString({ busqueda: '', categoria: undefined, tipo: null, stock_bajo: true })).toBe('?stock_bajo=true');
  });

  it('codifica texto de búsqueda de forma segura', () => {
    expect(queryString({ busqueda: 'urea 46%' })).toBe('?busqueda=urea+46%25');
  });
});

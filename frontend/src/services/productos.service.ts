import { api } from '../lib/api';
import { queryString } from '../lib/query-string';
import type { ProductoFase1, ProductoInput, Respuesta, RespuestaPaginada, TipoProducto } from '../types/fase1';

export type FiltrosProductos = { pagina: number; limite: number; busqueda?: string; categoria?: string; tipo?: TipoProducto | ''; activo?: boolean; stock_bajo?: boolean };

export const productosService = {
  listar: (filtros: FiltrosProductos) => api<RespuestaPaginada<ProductoFase1>>(`/productos${queryString(filtros)}`),
  obtener: (id: string) => api<Respuesta<ProductoFase1>>(`/productos/${id}`),
  crear: (datos: ProductoInput) => api<Respuesta<ProductoFase1>>('/productos', { method: 'POST', body: JSON.stringify(datos) }),
  actualizar: (id: string, datos: Partial<ProductoInput>) => api<Respuesta<ProductoFase1>>(`/productos/${id}`, { method: 'PUT', body: JSON.stringify(datos) }),
  desactivar: (id: string) => api<Respuesta<ProductoFase1>>(`/productos/${id}`, { method: 'DELETE' }),
  alertasStock: () => api<Respuesta<ProductoFase1[]>>('/productos/alertas-stock'),
};

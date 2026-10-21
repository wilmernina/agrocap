import { api } from '../lib/api';
import { queryString } from '../lib/query-string';
import type { CategoriaProducto, Respuesta, RespuestaPaginada, UnidadMedida } from '../types/fase1';

type Filtros = { pagina?: number; limite?: number; busqueda?: string; activo?: boolean };

export const catalogosService = {
  categorias: {
    listar: (filtros: Filtros = {}) => api<RespuestaPaginada<CategoriaProducto>>(`/categorias${queryString(filtros)}`),
    crear: (datos: { nombre: string; descripcion: string | null; activo: boolean }) => api<Respuesta<CategoriaProducto>>('/categorias', { method: 'POST', body: JSON.stringify(datos) }),
    actualizar: (id: string, datos: Partial<{ nombre: string; descripcion: string | null; activo: boolean }>) => api<Respuesta<CategoriaProducto>>(`/categorias/${id}`, { method: 'PUT', body: JSON.stringify(datos) }),
    desactivar: (id: string) => api<Respuesta<CategoriaProducto>>(`/categorias/${id}`, { method: 'DELETE' }),
  },
  unidades: {
    listar: (filtros: Filtros = {}) => api<RespuestaPaginada<UnidadMedida>>(`/unidades-medida${queryString(filtros)}`),
    crear: (datos: { nombre: string; abreviatura: string; activo: boolean }) => api<Respuesta<UnidadMedida>>('/unidades-medida', { method: 'POST', body: JSON.stringify(datos) }),
    actualizar: (id: string, datos: Partial<{ nombre: string; abreviatura: string; activo: boolean }>) => api<Respuesta<UnidadMedida>>(`/unidades-medida/${id}`, { method: 'PUT', body: JSON.stringify(datos) }),
    desactivar: (id: string) => api<Respuesta<UnidadMedida>>(`/unidades-medida/${id}`, { method: 'DELETE' }),
  },
};

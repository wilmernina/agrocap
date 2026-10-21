import { api } from '../lib/api';
import { queryString } from '../lib/query-string';
import type { ClienteFase1, ClienteInput, ProveedorFase1, ProveedorInput, Respuesta, RespuestaPaginada } from '../types/fase1';

type Filtros = { pagina: number; limite: number; busqueda?: string; activo?: boolean };

export const clientesService = {
  listar: (filtros: Filtros) => api<RespuestaPaginada<ClienteFase1>>(`/clientes${queryString(filtros)}`),
  crear: (datos: ClienteInput) => api<Respuesta<ClienteFase1>>('/clientes', { method: 'POST', body: JSON.stringify(datos) }),
  actualizar: (id: string, datos: Partial<ClienteInput>) => api<Respuesta<ClienteFase1>>(`/clientes/${id}`, { method: 'PUT', body: JSON.stringify(datos) }),
  desactivar: (id: string) => api<Respuesta<ClienteFase1>>(`/clientes/${id}`, { method: 'DELETE' }),
};

export const proveedoresService = {
  listar: (filtros: Filtros) => api<RespuestaPaginada<ProveedorFase1>>(`/proveedores${queryString(filtros)}`),
  crear: (datos: ProveedorInput) => api<Respuesta<ProveedorFase1>>('/proveedores', { method: 'POST', body: JSON.stringify(datos) }),
  actualizar: (id: string, datos: Partial<ProveedorInput>) => api<Respuesta<ProveedorFase1>>(`/proveedores/${id}`, { method: 'PUT', body: JSON.stringify(datos) }),
  desactivar: (id: string) => api<Respuesta<ProveedorFase1>>(`/proveedores/${id}`, { method: 'DELETE' }),
};

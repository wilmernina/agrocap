import { api } from '../lib/api';
import { queryString } from '../lib/query-string';
import type { Respuesta, RespuestaPaginada } from '../types/fase1';

export type PropiedadesParcela = {
  nombre: string;
  codigo: string;
  finca: string;
  fincaId: string;
  superficieCalculada: string | number;
  activo: boolean;
  cultivoActual: string | null;
};

export type GeoJsonParcelas = {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    id: string;
    geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: unknown };
    properties: PropiedadesParcela;
  }>;
  meta: { total: number; simplificado: boolean };
};

export type FincaCampo = { id: string; nombre: string; activo: boolean };
export type GeometriaParcela = { type: 'Polygon'; coordinates: number[][][] };
export type ParcelaInput = {
  fincaId: string;
  nombre: string;
  codigo: string;
  geometria: GeometriaParcela;
  tipoSuelo?: string;
  altitud?: number | null;
  pendiente?: number | null;
  sistemaRiego?: string;
  observaciones?: string;
  activo: boolean;
};

export const campoService = {
  geojsonParcelas: (filtros: { finca?: string; activo?: boolean } = {}) =>
    api<GeoJsonParcelas>(`/parcelas/geojson${queryString(filtros)}`),
  listarFincas: () => api<RespuestaPaginada<FincaCampo>>('/fincas?pagina=1&limite=100&activo=true'),
  crearParcela: (datos: ParcelaInput) => api<Respuesta<{ id: string }>>('/parcelas', { method: 'POST', body: JSON.stringify(datos) }),
  actualizarParcela: (id: string, datos: Partial<Pick<ParcelaInput, 'geometria'>>) => api<Respuesta<unknown>>(`/parcelas/${id}`, { method: 'PUT', body: JSON.stringify(datos) }),
  obtenerParcela: (id: string) => api<Respuesta<{ id: string; fincaId: string; finca: string; nombre: string; codigo: string; geometria: { type: 'Polygon'; coordinates: number[][][] }; superficieCalculada: string; tipoSuelo: string | null; altitud: string | null; pendiente: string | null; sistemaRiego: string | null; observaciones: string | null; activo: boolean }>>(`/parcelas/${id}`),
  kardexParcela: (id: string) => api<Respuesta<{ parcela: { id: string; nombre: string; codigo: string; finca: string; superficieCalculada: string }; movimientos: Array<Record<string, unknown>> }>>(`/parcelas/${id}/kardex`),
};

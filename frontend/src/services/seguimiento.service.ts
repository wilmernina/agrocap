import { api } from '../lib/api';
import { queryString } from '../lib/query-string';
import type { Respuesta, RespuestaPaginada } from '../types/fase1';

export type Finca = { id: string; nombre: string; propietarioId: string | null; direccion: string | null; municipio: string | null; departamento: string | null; superficieTotal: string; activo: boolean };
export type FincaDatos = Pick<Finca, 'nombre'> & Partial<Pick<Finca, 'propietarioId' | 'direccion' | 'municipio' | 'departamento' | 'activo'>>;
export type Cultivo = { id: string; nombreComun: string; nombreCientifico: string | null; variedad: string | null; tipo: string; cicloDias: number | null; activo: boolean };
export type CultivoDatos = Omit<Cultivo, 'id'>;
export type ParcelaSimple = { id: string; fincaId: string; nombre: string; codigo: string; superficieCalculada: string; activo: boolean };
export type Ciclo = { id: string; parcelaId: string; cultivoId: string; parcela: string; cultivo: string; variedad: string | null; fechaSiembra: string; fechaCosechaEstimada: string | null; fechaCosechaReal?: string | null; estado: 'planificado' | 'en_curso' | 'cosechado' | 'perdido'; rendimientoEstimado: string | null; rendimientoReal: string | null; unidadRendimiento: string | null; observaciones: string | null };
export type CicloDatos = Pick<Ciclo, 'parcelaId' | 'cultivoId' | 'fechaSiembra' | 'fechaCosechaEstimada' | 'estado' | 'unidadRendimiento' | 'observaciones'> & { rendimientoEstimado: number | null };
export type Actividad = { id: string; parcelaId: string; cicloCultivoId: string | null; parcela: string; tipo: string; fecha: string; descripcion: string; costoTotal: string; productoId: string | null; producto: string | null; cantidadProducto: string | null; almacenId: string | null; almacen: string | null; clima: { temp?: number; humedad?: number; viento?: number } };
export type ActividadDatos = { parcelaId: string; cicloCultivoId: string | null; tipo: string; fecha: string; descripcion: string; costoTotal: number; productoId: string | null; cantidadProducto: number | null; almacenId: string | null; clima: { temp?: number; humedad?: number; viento?: number } };
export type Monitoreo = { id: string; parcelaId: string; cicloCultivoId: string | null; parcela: string; cultivo: string | null; fecha: string; plagaEnfermedad: string; severidad: 'baja' | 'media' | 'alta' | 'critica'; incidenciaPorcentaje: string; accionTomada: string | null; productoAplicado: string | null; observaciones: string | null };
export type MonitoreoDatos = Omit<Monitoreo, 'id' | 'parcela' | 'cultivo' | 'incidenciaPorcentaje'> & { incidenciaPorcentaje: number };
export type FotoCampo = { id: string; parcelaId: string; archivoUrl: string; archivoThumbUrl: string; latitud: string; longitud: string; fechaCaptura: string | null; descripcion: string | null; etiquetas: string[]; createdAt: string };
export type FiltrosLista = { pagina?: number; limite?: number; busqueda?: string; activo?: boolean; tipo?: string; parcela?: string; cultivo?: string; estado?: string; desde?: string; hasta?: string; severidad?: string };

const rutas = {
  fincas: '/fincas', cultivos: '/cultivos', ciclos: '/ciclos', actividades: '/actividades', monitoreo: '/monitoreo', fotos: '/fotos',
};
export const seguimientoService = {
  fincas: (f: FiltrosLista = {}) => api<RespuestaPaginada<Finca>>(`${rutas.fincas}${queryString(f)}`),
  crearFinca: (d: FincaDatos) => api<Respuesta<Finca>>(rutas.fincas, { method: 'POST', body: JSON.stringify(d) }),
  actualizarFinca: (id: string, d: Partial<FincaDatos>) => api<Respuesta<Finca>>(`${rutas.fincas}/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
  desactivarFinca: (id: string) => api<Respuesta<Finca>>(`${rutas.fincas}/${id}`, { method: 'DELETE' }),
  cultivos: (f: FiltrosLista = {}) => api<RespuestaPaginada<Cultivo>>(`${rutas.cultivos}${queryString(f)}`),
  crearCultivo: (d: CultivoDatos) => api<Respuesta<Cultivo>>(rutas.cultivos, { method: 'POST', body: JSON.stringify(d) }),
  actualizarCultivo: (id: string, d: Partial<CultivoDatos>) => api<Respuesta<Cultivo>>(`${rutas.cultivos}/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
  desactivarCultivo: (id: string) => api<Respuesta<Cultivo>>(`${rutas.cultivos}/${id}`, { method: 'DELETE' }),
  parcelas: () => api<RespuestaPaginada<ParcelaSimple>>('/parcelas?pagina=1&limite=100&activo=true'),
  ciclos: (f: FiltrosLista = {}) => api<RespuestaPaginada<Ciclo>>(`${rutas.ciclos}${queryString({ ...f, pagina: f.pagina ?? 1, limite: f.limite ?? 100 })}`),
  crearCiclo: (d: CicloDatos) => api<Respuesta<Ciclo>>(rutas.ciclos, { method: 'POST', body: JSON.stringify(d) }),
  cosechar: (id: string, d: { rendimientoReal: number; fechaCosechaReal?: string; observaciones?: string }) => api<Respuesta<Ciclo>>(`${rutas.ciclos}/${id}/cosechar`, { method: 'POST', body: JSON.stringify(d) }),
  actividades: (f: FiltrosLista = {}) => api<RespuestaPaginada<Actividad>>(`${rutas.actividades}${queryString({ ...f, pagina: f.pagina ?? 1, limite: f.limite ?? 100 })}`),
  crearActividad: (d: ActividadDatos) => api<Respuesta<Actividad>>(rutas.actividades, { method: 'POST', body: JSON.stringify(d) }),
  alertas: () => api<Respuesta<Monitoreo[]>>('/monitoreo/alertas'),
  monitoreo: (f: FiltrosLista = {}) => api<RespuestaPaginada<Monitoreo>>(`${rutas.monitoreo}${queryString({ ...f, pagina: f.pagina ?? 1, limite: f.limite ?? 100 })}`),
  crearMonitoreo: (d: MonitoreoDatos) => api<Respuesta<Monitoreo>>(rutas.monitoreo, { method: 'POST', body: JSON.stringify(d) }),
  fotos: (f: FiltrosLista = {}) => api<RespuestaPaginada<FotoCampo>>(`${rutas.fotos}${queryString({ ...f, pagina: f.pagina ?? 1, limite: f.limite ?? 100 })}`),
  geojsonFotos: () => api<{ type: 'FeatureCollection'; features: Array<{ id: string; geometry: { coordinates: [number, number] }; properties: { foto: string; miniatura: string; descripcion: string | null; fechaCaptura: string | null } }> }>('/fotos/geojson'),
  crearFoto: (d: FormData, idempotencyKey?: string) => api<Respuesta<FotoCampo>>(rutas.fotos, { method: 'POST', body: d, headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined }),
  eliminarFoto: (id: string) => api<Respuesta<{ eliminado: boolean }>>(`${rutas.fotos}/${id}`, { method: 'DELETE' }),
};

export type ReporteCampo = Record<string, string | number | null>;
export const reportesCampoService = {
  superficiePorCultivo: () => api<Respuesta<ReporteCampo[]>>('/reportes/superficie-por-cultivo'),
  actividadesPorParcela: (f: { desde?: string; hasta?: string } = {}) => api<Respuesta<ReporteCampo[]>>(`/reportes/actividades-por-parcela${queryString(f)}`),
  costosPorParcela: (f: { desde?: string; hasta?: string } = {}) => api<Respuesta<ReporteCampo[]>>(`/reportes/costos-por-parcela${queryString(f)}`),
  productividadPorCultivo: (f: { desde?: string; hasta?: string } = {}) => api<Respuesta<ReporteCampo[]>>(`/reportes/productividad-por-cultivo${queryString(f)}`),
};

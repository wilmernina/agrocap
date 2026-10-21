import { api } from '../lib/api';
import { queryString } from '../lib/query-string';
import type { Almacen, Existencia, Kardex, MovimientoInventario, Respuesta, RespuestaPaginada } from '../types/fase1';

type FiltrosMovimientos = { pagina: number; limite: number; productoId?: string; almacenId?: string; tipo?: string; desde?: string; hasta?: string };

export const inventarioService = {
  almacenes: () => api<Respuesta<Almacen[]>>('/inventario/almacenes'),
  existencias: (almacenId?: string) => api<Respuesta<Existencia[]>>(`/inventario/existencias${queryString({ almacenId })}`),
  movimientos: (filtros: FiltrosMovimientos) => api<RespuestaPaginada<MovimientoInventario>>(`/inventario/movimientos${queryString(filtros)}`),
  ajustar: (datos: { productoId: string; almacenId: string; direccion: 'entrada' | 'salida'; cantidad: number; motivo: string }) => api<Respuesta<MovimientoInventario>>('/inventario/ajuste', { method: 'POST', body: JSON.stringify(datos) }),
  kardex: (productoId: string, filtros: { desde?: string; hasta?: string; almacenId?: string } = {}) => api<Respuesta<Kardex>>(`/reportes/kardex/${productoId}${queryString(filtros)}`),
  lotes: (almacenId?:string) => api<Respuesta<LoteInventario[]>>(`/inventario/lotes${queryString({almacenId})}`),
  registrarLoteApertura:(data:{productoId:string;almacenId:string;numeroLote:string;cantidad:number;fechaVencimiento?:string;ubicacion?:string})=>api<Respuesta<LoteInventario>>('/inventario/lotes/apertura',{method:'POST',body:JSON.stringify(data)}),
  alertas: () => api<Respuesta<AlertasInventario>>('/inventario/alertas'),
  cambiarEstadoLote: (id:string,data:{estado:'available'|'blocked'|'quarantine';ubicacion?:string|null;motivo:string})=>api<Respuesta<LoteInventario>>(`/inventario/lotes/${id}`,{method:'PATCH',body:JSON.stringify(data)}),
  reservarLote: (data:{loteProductoId:string;cantidad:number;clienteId?:string;referencia?:string})=>api('/inventario/lotes/reservas',{method:'POST',body:JSON.stringify(data)}),
  transferirLote:(data:{loteProductoId:string;almacenDestinoId:string;cantidad:number;motivo:string})=>api('/inventario/lotes/transferir',{method:'POST',body:JSON.stringify(data)}),
  devolverLote:(data:{loteProductoId:string;cantidad:number;motivo:string;referencia?:string})=>api('/inventario/lotes/devoluciones',{method:'POST',body:JSON.stringify(data)}),
  salidaVinculada:(data:{productoId:string;almacenId:string;loteProductoId:string;cantidad:number;motivo:string;clienteId?:string;campaniaId?:string;parcelaId?:string;cicloCultivoId?:string;actividadCampoId?:string;ordenTrabajoId?:string;referencia?:string})=>api('/inventario/salidas-vinculadas',{method:'POST',body:JSON.stringify(data)}),
  contarLote: (data:{loteProductoId:string;cantidadContada:number;motivo:string})=>api('/inventario/lotes/conteos',{method:'POST',body:JSON.stringify(data)}),
  presentaciones:()=>api<Respuesta<Array<Record<string,any>>>>('/inventario/presentaciones'),
  crearPresentacion:(data:{productoId:string;nombre:string;unidadId:string;factorAUnidadBase:number;codigoBarras?:string;precioVenta?:number})=>api('/inventario/presentaciones',{method:'POST',body:JSON.stringify(data)}),
  conversiones:()=>api<Respuesta<Array<Record<string,any>>>>('/inventario/conversiones-unidad'),
  crearConversion:(data:{unidadOrigenId:string;unidadDestinoId:string;factor:number})=>api('/inventario/conversiones-unidad',{method:'POST',body:JSON.stringify(data)}),
};

export const almacenesService = {
  listar: () => api<Respuesta<Almacen[]>>('/almacenes'),
  crear: (datos: Pick<Almacen, 'codigo' | 'nombre' | 'direccion' | 'activo'>) => api<Respuesta<Almacen>>('/almacenes', { method: 'POST', body: JSON.stringify(datos) }),
  actualizar: (id: string, datos: Pick<Almacen, 'codigo' | 'nombre' | 'direccion' | 'activo'>) => api<Respuesta<Almacen>>(`/almacenes/${id}`, { method: 'PUT', body: JSON.stringify(datos) }),
  desactivar: (id: string) => api<Respuesta<Almacen>>(`/almacenes/${id}`, { method: 'DELETE' }),
};

export type LoteInventario={id:string;productoId:string;sku:string;producto:string;tipo:string;almacenId:string;numeroLote:string;fechaVencimiento:string|null;cantidad:string;reservada:string;disponible:string;costoUnitario:string;estado:string;ubicacion:string|null};
export type AlertasInventario={stockBajo:Array<Record<string,unknown>>;vencimientos:Array<Record<string,unknown>>;sinMovimiento:Array<Record<string,unknown>>;diferencias:Array<Record<string,unknown>>};

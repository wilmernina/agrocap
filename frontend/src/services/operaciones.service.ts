import { api } from '../lib/api';
import { queryString } from '../lib/query-string';
import type { CompraDetalle, CompraInput, CompraResumen, EstadoCompra, EstadoVenta, PagoVenta, Respuesta, RespuestaPaginada, VentaDetalle, VentaInput, VentaResumen } from '../types/operaciones';

export const comprasService={
  listar:(filtros:{pagina:number;limite:number;busqueda?:string;estado?:EstadoCompra|'';proveedorId?:string;desde?:string;hasta?:string})=>api<RespuestaPaginada<CompraResumen>>(`/compras${queryString({...filtros,desde:filtros.desde?`${filtros.desde}T00:00:00.000-04:00`:undefined,hasta:filtros.hasta?`${filtros.hasta}T23:59:59.999-04:00`:undefined})}`),
  obtener:(id:string)=>api<Respuesta<CompraDetalle>>(`/compras/${id}`),
  crear:(datos:CompraInput)=>api<Respuesta<CompraDetalle>>('/compras',{method:'POST',body:JSON.stringify(datos)}),
  actualizar:(id:string,datos:Omit<CompraInput,'confirmar'>)=>api<Respuesta<CompraDetalle>>(`/compras/${id}`,{method:'PUT',body:JSON.stringify(datos)}),
  confirmar:(id:string)=>api<Respuesta<CompraDetalle>>(`/compras/${id}/confirmar`,{method:'POST'}),
  anular:(id:string)=>api<Respuesta<CompraDetalle>>(`/compras/${id}/anular`,{method:'POST'}),
};

export const ventasService={
  listar:(filtros:{pagina:number;limite:number;busqueda?:string;estado?:EstadoVenta|'';clienteId?:string;desde?:string;hasta?:string})=>api<RespuestaPaginada<VentaResumen>>(`/ventas${queryString({...filtros,desde:filtros.desde?`${filtros.desde}T00:00:00.000-04:00`:undefined,hasta:filtros.hasta?`${filtros.hasta}T23:59:59.999-04:00`:undefined})}`),
  obtener:(id:string)=>api<Respuesta<VentaDetalle>>(`/ventas/${id}`),
  crear:(datos:VentaInput)=>api<Respuesta<VentaDetalle>>('/ventas',{method:'POST',body:JSON.stringify(datos)}),
  actualizar:(id:string,datos:Omit<VentaInput,'confirmar'>)=>api<Respuesta<VentaDetalle>>(`/ventas/${id}`,{method:'PUT',body:JSON.stringify(datos)}),
  confirmar:(id:string)=>api<Respuesta<VentaDetalle>>(`/ventas/${id}/confirmar`,{method:'POST'}),
  pagar:(id:string,datos:{monto:number;metodoPago:PagoVenta['metodoPago'];referencia:string|null})=>api<Respuesta<PagoVenta>>(`/ventas/${id}/pagar`,{method:'POST',body:JSON.stringify(datos)}),
  anular:(id:string)=>api<Respuesta<VentaDetalle>>(`/ventas/${id}/anular`,{method:'POST'}),
};

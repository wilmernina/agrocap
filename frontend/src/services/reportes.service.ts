import { api } from '../lib/api';
import { queryString } from '../lib/query-string';
import type { ProductoMasVendido, ReporteVentas, Respuesta, StockValorizado } from '../types/operaciones';

export const reportesService={
  ventasPeriodo:(desde:string,hasta:string)=>api<Respuesta<ReporteVentas>>(`/reportes/ventas-periodo${queryString({desde,hasta})}`),
  productosMasVendidos:(filtros:{desde?:string;hasta?:string;limite?:number})=>api<Respuesta<ProductoMasVendido[]>>(`/reportes/productos-mas-vendidos${queryString(filtros)}`),
  stockValorizado:()=>api<Respuesta<StockValorizado>>('/reportes/stock-valorizado'),
};

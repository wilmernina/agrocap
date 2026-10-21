import { api } from '../lib/api';
import { queryString } from '../lib/query-string';
import type { Respuesta, RespuestaPaginada } from '../types/fase1';
import type { Cargo, ConfiguracionInput, ConfiguracionLaboral, DetallePlanilla, Empleado, EmpleadoInput, FacturaRcIva, Feriado, PeriodoDetalle, PeriodoPlanilla, ReportePlanillaMensual } from '../types/personal';

export const personalService = {
  empleados:(f:{pagina:number;limite:number;busqueda?:string;cargo?:string;estado?:string;tipoContrato?:string})=>api<RespuestaPaginada<Empleado>>(`/empleados${queryString(f)}`),
  empleado:(id:string)=>api<Respuesta<Empleado & {planillas:unknown[];asistencias:unknown[]}>>(`/empleados/${id}`),
  crearEmpleado:(d:EmpleadoInput)=>api<Respuesta<Empleado>>('/empleados',{method:'POST',body:JSON.stringify(d)}),
  actualizarEmpleado:(id:string,d:Partial<EmpleadoInput>)=>api<Respuesta<Empleado>>(`/empleados/${id}`,{method:'PUT',body:JSON.stringify(d)}),
  desactivarEmpleado:(id:string)=>api<Respuesta<Empleado>>(`/empleados/${id}`,{method:'DELETE'}),
  bajaEmpleado:(id:string,d:{fechaBaja:string;motivoBaja:string})=>api<Respuesta<{empleado:Empleado;liquidacionReferencial:{indemnizacionEstimada:number;salarioBaseIndemnizacion:number;diasServicio:number;nota:string}}>>(`/empleados/${id}/baja`,{method:'POST',body:JSON.stringify(d)}),
  cargos:()=>api<Respuesta<Cargo[]>>('/cargos'),
  crearCargo:(d:Omit<Cargo,'id'>)=>api<Respuesta<Cargo>>('/cargos',{method:'POST',body:JSON.stringify(d)}),
  actualizarCargo:(id:string,d:Partial<Omit<Cargo,'id'>>) =>api<Respuesta<Cargo>>(`/cargos/${id}`,{method:'PUT',body:JSON.stringify(d)}),
  desactivarCargo:(id:string)=>api<Respuesta<Cargo>>(`/cargos/${id}`,{method:'DELETE'}),
  configuraciones:()=>api<Respuesta<ConfiguracionLaboral[]>>('/configuracion-laboral'),
  crearConfiguracion:(d:ConfiguracionInput)=>api<Respuesta<ConfiguracionLaboral>>('/configuracion-laboral',{method:'POST',body:JSON.stringify(d)}),
  actualizarConfiguracion:(gestion:number,d:Partial<ConfiguracionInput>)=>api<Respuesta<ConfiguracionLaboral>>(`/configuracion-laboral/${gestion}`,{method:'PUT',body:JSON.stringify(d)}),
  desactivarConfiguracion:(gestion:number)=>api<Respuesta<ConfiguracionLaboral>>(`/configuracion-laboral/${gestion}`,{method:'DELETE'}),
  periodos:(gestion:number)=>api<RespuestaPaginada<PeriodoPlanilla>>(`/periodos${queryString({gestion,pagina:1,limite:100})}`),
  listarPeriodos:(f:{pagina:number;limite:number;gestion?:number;estado?:string;tipo?:string})=>api<RespuestaPaginada<PeriodoPlanilla>>(`/periodos${queryString(f)}`),
  crearPeriodo:(d:{tipo:'mensual'|'quincenal';gestion:number;mes:number;quincena?:1|2|null;fechaInicio:string;fechaFin:string;fechaPago?:string|null})=>api<Respuesta<PeriodoPlanilla>>('/periodos',{method:'POST',body:JSON.stringify(d)}),
  periodo:(id:string)=>api<Respuesta<PeriodoDetalle>>(`/periodos/${id}`),
  calcularPeriodo:(id:string)=>api<Respuesta<{periodo:PeriodoPlanilla;planillas:PeriodoDetalle['planillas'];vistaPrevia:boolean}>>(`/periodos/${id}/calcular`,{method:'POST'}),
  cerrarPeriodo:(id:string)=>api<Respuesta<{periodo:PeriodoPlanilla;planillas:number;boletas:number;totalGanado:string;totalDescuentos:string;liquidoTotal:string}>>(`/periodos/${id}/cerrar`,{method:'POST'}),
  anularPeriodo:(id:string)=>api<Respuesta<PeriodoPlanilla>>(`/periodos/${id}/anular`,{method:'POST'}),
  pagarPeriodo:(id:string,d:{metodoPago:'efectivo'|'transferencia'|'cheque'|'qr'|'otro';fechaPago?:string;referenciaPago?:string})=>api<Respuesta<PeriodoPlanilla>>(`/periodos/${id}/pagar`,{method:'POST',body:JSON.stringify(d)}),
  planilla:(id:string)=>api<Respuesta<DetallePlanilla>>(`/planillas/${id}`),
  actualizarPlanilla:(id:string,d:Record<string,unknown>)=>api<Respuesta<DetallePlanilla>>(`/planillas/${id}`,{method:'PUT',body:JSON.stringify(d)}),
  pagarPlanilla:(id:string,d:{metodoPago:'efectivo'|'transferencia'|'cheque'|'qr'|'otro';fechaPago?:string;referenciaPago?:string})=>api<Respuesta<unknown>>(`/planillas/${id}/pagar`,{method:'POST',body:JSON.stringify(d)}),
  facturasPlanilla:(id:string)=>api<Respuesta<FacturaRcIva[]>>(`/planillas/${id}/facturas-rc-iva`),
  crearFactura:(id:string,d:Omit<FacturaRcIva,'id'|'planillaId'|'empleadoId'|'monto'>&{monto:number})=>api<Respuesta<DetallePlanilla>>(`/planillas/${id}/facturas-rc-iva`,{method:'POST',body:JSON.stringify(d)}),
  eliminarFactura:(id:string)=>api<Respuesta<unknown>>(`/facturas-rc-iva/${id}`,{method:'DELETE'}),
  feriados:(f:{gestion?:number;departamento?:string;tipo?:string})=>api<Respuesta<Feriado[]>>(`/feriados${queryString(f)}`),
  crearFeriado:(d:Omit<Feriado,'id'>)=>api<Respuesta<Feriado>>('/feriados',{method:'POST',body:JSON.stringify(d)}),
  actualizarFeriado:(id:string,d:Partial<Omit<Feriado,'id'>>)=>api<Respuesta<Feriado>>(`/feriados/${id}`,{method:'PUT',body:JSON.stringify(d)}),
  desactivarFeriado:(id:string)=>api<Respuesta<Feriado>>(`/feriados/${id}`,{method:'DELETE'}),
  precargarFeriados:(gestion:number)=>api<Respuesta<{gestion:number;creados:number;feriados:Feriado[]}>>(`/feriados/precargar/${gestion}`,{method:'POST'}),
  reporteLaboral:<T>(ruta:string,filtros:Record<string,string|number|undefined>)=>api<Respuesta<T>>(`/reportes/${ruta}${queryString(filtros)}`),
  aguinaldo:(gestion:number)=>api<Respuesta<{gestion:number;totalEstimado:number;detalle:Array<{empleado:Empleado;totalDevengado:number;aguinaldoEstimado:number}>}>>(`/reportes/aguinaldo${queryString({gestion})}`),
  descargar:(path:string,nombre:string)=>descargarArchivo(path,nombre),
  planillasMes:(gestion:number,mes:number)=>api<Respuesta<ReportePlanillaMensual>>(`/reportes/planillas-mensual${queryString({gestion,mes})}`),
};

async function descargarArchivo(path:string,nombre:string){const token=(await import('../store/auth')).useAuth.getState().accessToken;const response=await fetch(`${(await import('../config/env')).env.VITE_API_URL}${path}`,{credentials:'include',headers:token?{Authorization:`Bearer ${token}`}:{}});if(!response.ok){const cuerpo=await response.json().catch(()=>null);throw new Error(cuerpo?.error?.message??`No se pudo descargar el archivo (${response.status})`)}const url=URL.createObjectURL(await response.blob()),enlace=document.createElement('a');enlace.href=url;enlace.download=nombre;document.body.appendChild(enlace);enlace.click();enlace.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}

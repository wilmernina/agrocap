import { api } from '../lib/api';
import { queryString } from '../lib/query-string';
import type { Respuesta, RespuestaPaginada } from '../types/fase1';
import type { Empleado } from '../types/personal';

export type TipoAsistencia='normal'|'feriado'|'domingo'|'licencia'|'vacacion'|'falta'|'permiso';
export type Asistencia={id:string;empleadoId:string;fecha:string;horaEntrada:string|null;horaSalida:string|null;horasTrabajadas:string;horasExtra:string;horasExtraNocturnas:string;tipo:TipoAsistencia;parcelaId:string|null;actividadId:string|null;latitudEntrada:string|null;longitudEntrada:string|null;precisionGpsEntrada:string|null;latitudSalida:string|null;longitudSalida:string|null;precisionGpsSalida:string|null;observaciones:string|null};
export type AsistenciaConEmpleado={asistencia:Asistencia;empleado:Empleado};
export type Tareo={id:string;empleadoId:string;fecha:string;descripcionTarea:string;cantidad:string;unidad:string;precioUnitario:string;subtotal:string;parcelaId:string|null;latitud:number|string|null;longitud:number|string|null;precisionGps:number|string|null;estado:'pendiente'|'aprobado'|'pagado'};
export type TareoConEmpleado={tareo:Tareo;empleado:Empleado};
export type AsistenciaLoteInput={empleadoId:string;fecha:string;horaEntrada?:string|null;horaSalida?:string|null;tipo?:TipoAsistencia;parcelaId?:string|null;actividadId?:string|null;latitudEntrada?:number|null;longitudEntrada?:number|null;precisionGpsEntrada?:number|null;latitudSalida?:number|null;longitudSalida?:number|null;precisionGpsSalida?:number|null;observaciones?:string|null};
export type TareoInput={empleadoId:string;fecha:string;descripcionTarea:string;cantidad:number;unidad:string;precioUnitario:number;parcelaId:string|null;latitud?:number|null;longitud?:number|null;precisionGps?:number|null};

export const asistenciaTareosService={
  sincronizarLote:(operaciones:Array<{id:string;tipo:'asistencia'|'tareo';payload:Record<string,unknown>}>)=>api<Respuesta<Array<{id:string;procesado:boolean;repetido?:boolean;resultado?:unknown;error?:string}>>>('/sync/lote',{method:'POST',body:JSON.stringify({operaciones})}),
  dia:(fecha:string)=>api<Respuesta<AsistenciaConEmpleado[]>>(`/asistencias/por-fecha${queryString({fecha})}`),
  mensual:(empleado:string,mes:number,gestion:number)=>api<Respuesta<{empleado:Empleado;diasTrabajados:number;faltas:number;permisos:number;licencias:number;vacaciones:number;horasTrabajadas:number;horasExtra:number;horasExtraNocturnas:number;asistencias:Asistencia[]}>>(`/asistencias/reporte-mensual${queryString({empleado,mes,gestion})}`),
  marcar:(d:{empleadoId:string;fecha:string;hora?:string;parcelaId?:string|null;latitud?:number;longitud?:number;precisionGps?:number})=>api<Respuesta<{accion:'entrada'|'salida';asistencia:Asistencia}>>('/asistencias/marcar',{method:'POST',body:JSON.stringify(d)}),
  crearLote:(asistencias:AsistenciaLoteInput[])=>api<Respuesta<Asistencia[]>>('/asistencias',{method:'POST',body:JSON.stringify({asistencias})}),
  actualizar:(id:string,d:Partial<AsistenciaLoteInput>&{justificacion:string})=>api<Respuesta<Asistencia>>(`/asistencias/${id}`,{method:'PUT',body:JSON.stringify(d)}),
  tareos:(f:{pagina:number;limite:number;estado?:string;desde?:string;hasta?:string;empleado?:string})=>api<RespuestaPaginada<TareoConEmpleado>>(`/tareos${queryString(f)}`),
  crearTareo:(d:TareoInput)=>api<Respuesta<Tareo>>('/tareos',{method:'POST',body:JSON.stringify(d)}),
  actualizarTareo:(id:string,d:Partial<Omit<TareoInput,'empleadoId'|'fecha'>>)=>api<Respuesta<Tareo>>(`/tareos/${id}`,{method:'PUT',body:JSON.stringify(d)}),
  aprobarTareo:(id:string)=>api<Respuesta<Tareo>>(`/tareos/${id}/aprobar`,{method:'POST'}),
  eliminarTareo:(id:string)=>api<Respuesta<Tareo>>(`/tareos/${id}`,{method:'DELETE'}),
};

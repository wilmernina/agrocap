import { differenceInYears, parseISO } from 'date-fns';
import { AppError, ConflictError, NotFoundError } from '../../shared/errors.ts';
import type { ContextoAuditoria } from '../../shared/auditoria.ts';
import { PlanillasRepository, type CalculoPlanilla, type Concepto } from './planillas.repository.ts';
import type { ActualizarPlanillaInput, ConsultaPeriodos, FacturaRcIvaInput, PagoPeriodoInput, PagoPlanillaInput, PeriodoInput } from './planillas.schemas.ts';

type Config = NonNullable<Awaited<ReturnType<PlanillasRepository['configuracion']>>>;
const redondear = (n:number) => Math.round((n+Number.EPSILON)*100)/100;
const dinero = (n:number) => redondear(n).toFixed(2);
const numeroPorcentaje = (v:string|number|undefined) => Number(v ?? 0)/100;
const sumaDetalles = (v:unknown) => Array.isArray(v) ? v.reduce((s,x)=>s+Number((x as {monto?:unknown}).monto??0),0) : 0;
const normTipo = (tipo:string) => tipo === 'mensual' ? 'Salario por días trabajados' : tipo === 'jornal' ? 'Jornal' : 'Trabajo a destajo aprobado';

function porcentajeAntiguedad(anios:number) {
  if(anios<2)return 0;
  if(anios===2)return 5;
  if(anios===3)return 11;
  if(anios===4)return 18;
  return Math.min(50,18+(anios-4)*7);
}
function aporteSolidario(ganado:number,config:Config) {
  const tramos = Array.isArray(config.porcentajeAporteSolidario) ? config.porcentajeAporteSolidario as {desde:number|string;hasta:number|string|null;porcentaje:number|string}[] : [];
  if(tramos.length){return redondear(tramos.reduce((total,t)=>{const desde=Number(t.desde),hasta=t.hasta===null?ganado:Math.min(ganado,Number(t.hasta));return total+Math.max(0,hasta-desde)*Number(t.porcentaje)/100;},0));}
  return 0;
}

export class PlanillasService {
  constructor(private readonly repo=new PlanillasRepository()){}
  private async existe<T>(v:T|undefined,nombre:string){if(!v)throw new NotFoundError(nombre);return v;}
  private async config(org:string,gestion:number){return this.existe(await this.repo.configuracion(org,gestion),`Configuración laboral ${gestion}`);}
  listarPeriodos(org:string,q:ConsultaPeriodos){return this.repo.listarPeriodos(org,q);}
  async obtenerPeriodo(org:string,id:string){const periodo=await this.existe(await this.repo.periodo(org,id),'Período de planilla');return {...periodo,planillas:await this.repo.planillasPeriodo(org,id)};}
  crearPeriodo(d:PeriodoInput,ctx:ContextoAuditoria){return this.conErrorDuplicado(()=>this.repo.crearPeriodo(d,ctx),'Ya existe un período para esa gestión, mes y quincena');}
  private async conErrorDuplicado<T>(fn:()=>Promise<T>,mensaje:string):Promise<T>{try{return await fn();}catch(e){if((e as {code?:string}).code==='23505')throw new ConflictError(mensaje);if((e as {code?:string}).code==='23503')throw new AppError(422,'Una referencia de la solicitud no es válida','REFERENCIA_INVALIDA');throw e;}}
  private conceptos(f:Partial<CalculoPlanilla>):Concepto[]{
    const cs:Concepto[]=[];let orden=0;const ingreso=(nombre:string,monto:number)=>{if(monto>0)cs.push({tipo:'ingreso',concepto:nombre,monto:dinero(monto),orden:orden++});};const descuento=(nombre:string,monto:number)=>{if(monto>0)cs.push({tipo:'descuento',concepto:nombre,monto:dinero(monto),orden:orden++});};
    ingreso('Remuneración por días / tareos',Number(f.montoGanado??0));ingreso('Horas extra y recargos',Number(f.horasExtraMonto??0));ingreso('Bono de antigüedad',Number(f.bonoAntiguedad??0));ingreso('Bono de producción',Number(f.bonoProduccion??0));
    for(const b of f.otrosBonos??[])ingreso(b.concepto,Number(b.monto));
    descuento('Aporte laboral AFP',Number(f.aporteAfp??0));descuento('RC-IVA neto',Number(f.rcIva??0));descuento('Aporte solidario',Number(f.aporteSolidario??0));for(const d of f.otrosDescuentos??[])descuento(d.concepto,Number(d.monto));return cs;
  }
  private liquidar(entrada:Omit<CalculoPlanilla,'totalGanado'|'aporteAfp'|'aporteAfpComision'|'rcIva'|'aporteSolidario'|'totalDescuentos'|'liquidoPagable'|'conceptos'>,config:Config,facturas:number):CalculoPlanilla{
    const totalGanado=redondear(Number(entrada.montoGanado)+Number(entrada.horasExtraMonto)+Number(entrada.bonoAntiguedad)+Number(entrada.bonoProduccion)+sumaDetalles(entrada.otrosBonos));
    const afp=redondear(totalGanado*numeroPorcentaje(config.aporteAfpLaboral));
    const comision=redondear(totalGanado*numeroPorcentaje(config.comisionAfp));
    const rcBruto=redondear(totalGanado*numeroPorcentaje(config.tasaRcIva));
    const rcNeto=Math.max(0,redondear(rcBruto-facturas*numeroPorcentaje(config.tasaRcIva)));
    const solidario=aporteSolidario(totalGanado,config);
    const descuentos=redondear(afp+rcNeto+solidario+sumaDetalles(entrada.otrosDescuentos));
    const result:CalculoPlanilla={...entrada,totalGanado:dinero(totalGanado),aporteAfp:dinero(afp),aporteAfpComision:dinero(comision),rcIva:dinero(rcNeto),aporteSolidario:dinero(solidario),totalDescuentos:dinero(descuentos),liquidoPagable:dinero(totalGanado-descuentos),conceptos:[]};
    result.conceptos=this.conceptos(result);return result;
  }
  async calcularPeriodo(org:string,id:string,ctx:ContextoAuditoria){
    const periodo=await this.existe(await this.repo.periodo(org,id),'Período de planilla');
    if(periodo.estado==='calculado')return {periodo,planillas:await this.repo.planillasPeriodo(org,id),vistaPrevia:true};
    if(periodo.estado!=='abierto')throw new ConflictError('Solo se puede calcular un período abierto');
    const config=await this.config(org,periodo.gestion), [personal,marcas,tareos,existentes]=await Promise.all([this.repo.empleadosActivos(org),this.repo.asistenciasPeriodo(org,periodo.fechaInicio,periodo.fechaFin),this.repo.tareosAprobados(org,periodo.fechaInicio,periodo.fechaFin),this.repo.planillasPeriodo(org,id)]);
    if(!personal.length)throw new ConflictError('No hay empleados activos para calcular');
    const facturasPorPlanilla=new Map<string,number>();for(const fila of existentes){const detalle=await this.repo.detalle(org,fila.planilla.id);facturasPorPlanilla.set(fila.planilla.id,(detalle?.facturas??[]).reduce((s,f)=>s+Number(f.monto),0));}
    const filas:CalculoPlanilla[]=personal.map(e=>{
      const rows=marcas.filter(a=>a.empleadoId===e.id), pagables=rows.filter(a=>['normal','feriado','domingo','vacacion'].includes(a.tipo));
      const dias=pagables.length, jornales=tareos.filter(t=>t.empleadoId===e.id), montoTareos=jornales.reduce((s,t)=>s+Number(t.subtotal),0);
      const salarioMensual=e.tipoPago==='jornal'?Number(e.valorJornal??0)*Number(config.diasMesBase):Number(e.salarioBase);
      const ganado=e.tipoPago==='destajo'?montoTareos:e.tipoPago==='jornal'?Number(e.valorJornal??0)*dias:Number(e.salarioBase)/Number(config.diasMesBase)*dias;
      const tarifaHora=salarioMensual/Number(config.horasMesBase);
      const hExtra=rows.reduce((s,a)=>s+Number(a.horasExtra),0),hNocturnas=rows.reduce((s,a)=>s+Number(a.horasExtraNocturnas),0);
      const recargosDomingo=rows.filter(a=>a.tipo==='domingo'||a.tipo==='feriado').reduce((s,a)=>s+Number(a.horasTrabajadas),0)*tarifaHora*Number(config.recargoDominical);
      const extraMonto=hExtra*tarifaHora*(1+Number(config.recargoHoraExtra))+hNocturnas*tarifaHora*(1+Number(config.recargoHoraExtra)+Number(config.recargoNocturno))+recargosDomingo;
      const años=periodo.fechaFin>=e.fechaIngreso?differenceInYears(parseISO(periodo.fechaFin),parseISO(e.fechaIngreso)):0;
      const antiguedad=Number(config.salarioMinimoNacional)*porcentajeAntiguedad(años)/100*dias/Number(config.diasMesBase);
      const base={empleadoId:e.id,salarioBase:dinero(Number(e.salarioBase)),diasTrabajados:dinero(dias),montoGanado:dinero(ganado),horasExtraMonto:dinero(extraMonto),bonoAntiguedad:dinero(antiguedad),bonoProduccion:dinero(e.tipoPago==='destajo'?0:montoTareos),otrosBonos:[] as {concepto:string;monto:string}[],otrosDescuentos:[] as {concepto:string;monto:string}[],observaciones:null};
      return this.liquidar(base,config,existentes.find(x=>x.planilla.empleadoId===e.id)?facturasPorPlanilla.get(existentes.find(x=>x.planilla.empleadoId===e.id)!.planilla.id)??0:0);
    });
    const guardadas=await this.repo.guardarCalculo(org,id,filas,ctx);if(!guardadas)throw new NotFoundError('Período de planilla');return {periodo:await this.repo.periodo(org,id),planillas:await this.repo.planillasPeriodo(org,id),vistaPrevia:false};
  }
  async detallePlanilla(org:string,id:string){return this.existe(await this.repo.detalle(org,id),'Planilla');}
  async ajustarPlanilla(org:string,id:string,d:ActualizarPlanillaInput,ctx:ContextoAuditoria){
    const fila=await this.existe(await this.repo.detalle(org,id),'Planilla');if(fila.planilla.estado!=='calculado'||!['abierto','calculado'].includes(fila.periodo.estado))throw new ConflictError('No se puede ajustar una planilla cerrada');
    const config=await this.config(org,fila.periodo.gestion),cambios:Partial<CalculoPlanilla>={};
    const dias=Number(d.diasTrabajados??fila.planilla.diasTrabajados);let ganado=d.montoGanado===undefined?Number(fila.planilla.montoGanado):Number(d.montoGanado);
    if(d.diasTrabajados!==undefined&&d.montoGanado===undefined){ganado=fila.empleado.tipoPago==='jornal'?Number(fila.empleado.valorJornal??0)*dias:Number(fila.planilla.salarioBase)/Number(config.diasMesBase)*dias;}
    const base={empleadoId:fila.planilla.empleadoId,salarioBase:fila.planilla.salarioBase,diasTrabajados:dinero(dias),montoGanado:dinero(ganado),horasExtraMonto:d.horasExtraMonto??fila.planilla.horasExtraMonto,bonoAntiguedad:d.bonoAntiguedad??fila.planilla.bonoAntiguedad,bonoProduccion:d.bonoProduccion??fila.planilla.bonoProduccion,otrosBonos:d.otrosBonos??fila.planilla.otrosBonos as {concepto:string;monto:string}[],otrosDescuentos:d.otrosDescuentos??fila.planilla.otrosDescuentos as {concepto:string;monto:string}[],observaciones:d.observaciones===undefined?fila.planilla.observaciones:d.observaciones};
    const actualizado=this.liquidar(base,config,fila.facturas.reduce((s,f)=>s+Number(f.monto),0));Object.assign(cambios,actualizado);const {conceptos,...campos}=cambios;await this.repo.actualizarImportes(org,id,campos,conceptos??[],ctx);return this.detallePlanilla(org,id);
  }
  async cerrar(org:string,id:string,ctx:ContextoAuditoria){const periodo=await this.existe(await this.repo.periodo(org,id),'Período de planilla');const resumen=await this.repo.planillasPeriodo(org,id);const resultado=await this.repo.cerrarPeriodo(org,id,ctx);if(!resultado)throw new NotFoundError('Período de planilla');return {...resultado,totalGanado:dinero(resumen.reduce((s,r)=>s+Number(r.planilla.totalGanado),0)),totalDescuentos:dinero(resumen.reduce((s,r)=>s+Number(r.planilla.totalDescuentos),0)),liquidoTotal:dinero(resumen.reduce((s,r)=>s+Number(r.planilla.liquidoPagable),0))};}
  async pagarPlanilla(org:string,id:string,d:PagoPlanillaInput,ctx:ContextoAuditoria){return this.existe(await this.repo.pagarIndividual(org,id,d,ctx),'Planilla');}
  async pagarPeriodo(org:string,id:string,d:PagoPeriodoInput,ctx:ContextoAuditoria){const r=await this.repo.pagarPeriodo(org,id,d,ctx);return this.existe(r,'Período de planilla');}
  async anular(org:string,id:string,ctx:ContextoAuditoria){return this.existe(await this.repo.anularPeriodo(org,id,ctx),'Período de planilla');}
  async listarFacturas(org:string,id:string){await this.detallePlanilla(org,id);return this.repo.listarFacturas(org,id);}
  async agregarFactura(org:string,id:string,d:FacturaRcIvaInput,ctx:ContextoAuditoria){const fila=await this.detallePlanilla(org,id);if(d.fecha<fila.periodo.fechaInicio||d.fecha>fila.periodo.fechaFin)throw new AppError(422,'La fecha de factura debe estar dentro del período de planilla','FECHA_FACTURA_INVALIDA');const config=await this.config(org,fila.periodo.gestion),suma=fila.facturas.reduce((s,f)=>s+Number(f.monto),0)+Number(d.monto);const base={empleadoId:fila.planilla.empleadoId,salarioBase:fila.planilla.salarioBase,diasTrabajados:fila.planilla.diasTrabajados,montoGanado:fila.planilla.montoGanado,horasExtraMonto:fila.planilla.horasExtraMonto,bonoAntiguedad:fila.planilla.bonoAntiguedad,bonoProduccion:fila.planilla.bonoProduccion,otrosBonos:fila.planilla.otrosBonos as {concepto:string;monto:string}[],otrosDescuentos:fila.planilla.otrosDescuentos as {concepto:string;monto:string}[],observaciones:fila.planilla.observaciones};const liq=this.liquidar(base,config,suma),{conceptos,...campos}=liq;const creada=await this.repo.insertarFactura(org,id,fila.planilla.empleadoId,d,campos,conceptos,ctx);if(!creada)throw new NotFoundError('Planilla');return this.detallePlanilla(org,id);}
  async eliminarFactura(org:string,facturaId:string,ctx:ContextoAuditoria){const factura=await this.repo.obtenerFactura(org,facturaId);if(!factura)throw new NotFoundError('Factura RC-IVA');const fila=await this.detallePlanilla(org,factura.planillaId),config=await this.config(org,fila.periodo.gestion),remaining=fila.facturas.filter(f=>f.id!==facturaId).reduce((s,f)=>s+Number(f.monto),0);const base={empleadoId:fila.planilla.empleadoId,salarioBase:fila.planilla.salarioBase,diasTrabajados:fila.planilla.diasTrabajados,montoGanado:fila.planilla.montoGanado,horasExtraMonto:fila.planilla.horasExtraMonto,bonoAntiguedad:fila.planilla.bonoAntiguedad,bonoProduccion:fila.planilla.bonoProduccion,otrosBonos:fila.planilla.otrosBonos as {concepto:string;monto:string}[],otrosDescuentos:fila.planilla.otrosDescuentos as {concepto:string;monto:string}[],observaciones:fila.planilla.observaciones};const liq=this.liquidar(base,config,remaining),{conceptos,...campos}=liq;await this.repo.eliminarFactura(org,facturaId,campos,conceptos,ctx);return this.detallePlanilla(org,factura.planillaId);}
  async exportarPeriodo(org:string,id:string){const periodo=await this.existe(await this.repo.periodo(org,id),'Período de planilla');return {periodo,filas:await this.repo.planillasPeriodo(org,id)};}
  async datosBoleta(org:string,id:string){const fila=await this.detallePlanilla(org,id);if(!fila.boleta)throw new ConflictError('La boleta se genera al cerrar el período');if(fila.planilla.estado==='anulado')throw new ConflictError('La planilla está anulada');return fila;}
}

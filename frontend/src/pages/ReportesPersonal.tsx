import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '../components/PageHeader';
import { Button, Input } from '../components/ui';
import { descargarCsv, descargarPdf } from '../lib/export';
import { money } from '../lib/utils';
import { personalService } from '../services/personal.service';
import { useAuth } from '../store/auth';

type Reporte='planillas'|'costos'|'antiguedad'|'provisiones'|'afp'|'rciva'|'aguinaldo'|'mayores';
type Fila=Record<string,unknown>;
const nombres:Record<Reporte,string>={planillas:'Planillas mensual',costos:'Costos por parcela',antiguedad:'Antigüedad de empleados',provisiones:'Provisiones',afp:'Aportes AFP',rciva:'Retenciones RC-IVA',aguinaldo:'Aguinaldo',mayores:'Libro de mano de obra'};
const metricas:Record<Reporte,string>={planillas:'liquidoPagable',costos:'costoTotal',antiguedad:'aniosCompletos',provisiones:'provisionAguinaldo',afp:'totalAportes',rciva:'rcIvaRetenido',aguinaldo:'aguinaldoEstimado',mayores:'costoLaboralTotal'};
const tabs:Reporte[]=['planillas','costos','antiguedad','provisiones','afp','rciva','aguinaldo','mayores'];
const etiqueta=(s:string)=>s.replace(/([a-z])([A-Z])/g,'$1 $2').replace(/^./,c=>c.toUpperCase());
const formato=(k:string,v:unknown)=>{if(v==null)return '—';if(typeof v==='object')return JSON.stringify(v);if(/monto|total|costo|aporte|provision|aguinaldo|retenido|devengado|remuneracion|liquido|descuento|ganado/i.test(k)&&Number.isFinite(Number(v)))return money(Number(v));return String(v)};
const nombreFila=(f:Fila)=>String(f.empleado??f.parcela??f.finca??f.codigo??f.periodoId??f.mes??'');

export function ReportesPersonal(){
  const admin=useAuth(s=>s.user?.role==='admin');
  const[tab,setTab]=useState<Reporte>('planillas'),[gestion,setGestion]=useState(new Date().getFullYear()),[mes,setMes]=useState(new Date().getMonth()+1),[desde,setDesde]=useState(''),[hasta,setHasta]=useState('');
  const consulta=useQuery({queryKey:['reportes-personal',tab,gestion,mes,desde,hasta],enabled:admin,queryFn:async()=>{
    if(tab==='aguinaldo')return personalService.aguinaldo(gestion).then(r=>r.data);
    const filtros=tab==='costos'?{desde:desde||undefined,hasta:hasta||undefined}:tab==='antiguedad'?{}:{gestion,...(['planillas','afp','rciva'].includes(tab)?{mes}: {})};
    return personalService.reporteLaboral<unknown>(({planillas:'planillas-mensual',costos:'costos-personal-por-parcela',antiguedad:'antiguedad-empleados',provisiones:'provisiones',afp:'aportes-afp',rciva:'rc-iva-empleados',mayores:'libro-mayores-mano-obra'} as Record<Reporte,string>)[tab]!,filtros).then(r=>r.data);
  }});
  const payload=consulta.data as unknown;
  let filas:Fila[]=Array.isArray(payload)?payload as Fila[]:[];
  let resumen='';
  if(tab==='planillas'&&payload&&typeof payload==='object'&&!Array.isArray(payload)){const p=payload as {detalle?:Fila[];resumen?:Record<string,unknown>};filas=p.detalle??[];if(p.resumen)resumen=`Planillas ${p.resumen.planillas??0} · Ganado ${money(Number(p.resumen.totalGanado??0))} · Descuentos ${money(Number(p.resumen.totalDescuentos??0))} · Líquido ${money(Number(p.resumen.liquidoPagable??0))}`}
  if(tab==='aguinaldo'&&payload&&typeof payload==='object'&&!Array.isArray(payload)){const p=payload as {detalle?:Array<{empleado:Record<string,unknown>;totalDevengado:number;aguinaldoEstimado:number}>;totalEstimado?:number};filas=(p.detalle??[]).map(x=>({codigo:x.empleado.codigo,ci:x.empleado.ci,empleado:`${x.empleado.nombres??''} ${x.empleado.apellidos??''}`.trim(),estado:x.empleado.estado,totalDevengado:x.totalDevengado,aguinaldoEstimado:x.aguinaldoEstimado}));resumen=`Total estimado de aguinaldos: ${money(p.totalEstimado??0)}`}
  const campos=filas.length?Object.keys(filas[0]!):[];
  const encabezados=campos.map(etiqueta);
  const valores=filas.map(f=>campos.map(c=>formato(c,f[c])));
  const exportarCsv=()=>{if(!filas.length){toast.info('No hay datos para exportar.');return}descargarCsv(`reporte_personal_${tab}_${gestion}_${mes}`,encabezados,valores);toast.success('Archivo compatible con Excel descargado.')};
  const exportarPdf=async()=>{if(!filas.length){toast.info('No hay datos para exportar.');return}await descargarPdf(nombres[tab],`reporte_personal_${tab}_${gestion}_${mes}`,encabezados,valores,resumen);toast.success('PDF descargado')};
  const clave=metricas[tab],grafico=filas.slice(0,15).map(f=>({nombre:nombreFila(f)||'Registro',valor:Number(f[clave]??0)}));
  if(!admin)return <><PageHeader title="Reportes laborales" description="Acceso restringido al rol administrador."/><div className="card p-6 text-sm text-stone-600">Solicita al administrador acceso a los reportes de nómina, aportes y retenciones.</div></>;
  return <><PageHeader title="Reportes laborales" description="Costos, aportes, provisiones y nóminas del personal." action={<div className="flex gap-2"><Button variant="secondary" onClick={exportarCsv}><FileSpreadsheet size={16}/>Excel (CSV)</Button><Button variant="secondary" onClick={()=>void exportarPdf().catch((e:Error)=>toast.error(e.message))}><FileText size={16}/>PDF</Button></div>}/>
    <div className="mb-4 flex max-w-full gap-1 overflow-x-auto rounded-xl border bg-white p-1">{tabs.map(t=><button key={t} onClick={()=>setTab(t)} className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold ${tab===t?'bg-brand-700 text-white':'text-stone-500 hover:bg-stone-50'}`}>{nombres[t]}</button>)}</div>
    <div className="mb-4 flex flex-wrap items-end gap-3">{!['costos','antiguedad'].includes(tab)&&<><label className="text-xs font-semibold text-stone-500">Gestión<Input className="mt-1 w-32" type="number" min="2000" max="2200" value={gestion} onChange={e=>setGestion(Number(e.target.value))}/></label>{['planillas','afp','rciva'].includes(tab)&&<label className="text-xs font-semibold text-stone-500">Mes<Input className="mt-1 w-28" type="number" min="1" max="12" value={mes} onChange={e=>setMes(Number(e.target.value))}/></label>}</>}{tab==='costos'&&<><label className="text-xs font-semibold text-stone-500">Desde<Input className="mt-1" type="date" value={desde} onChange={e=>setDesde(e.target.value)}/></label><label className="text-xs font-semibold text-stone-500">Hasta<Input className="mt-1" type="date" value={hasta} onChange={e=>setHasta(e.target.value)}/></label></>}</div>
    {resumen&&<div className="mb-4 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">{resumen}</div>}{consulta.isError&&<div className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{(consulta.error as Error).message}</div>}
    <div className="grid gap-4 xl:grid-cols-[1fr_1.4fr]"><section className="card p-4"><h2 className="mb-3 font-semibold">Indicador: {etiqueta(clave)}</h2><div className="h-80">{consulta.isLoading?<div className="grid h-full place-items-center text-sm text-stone-500">Cargando reporte…</div>:grafico.length?<ResponsiveContainer width="100%" height="100%"><BarChart data={grafico} margin={{top:8,right:12,left:4,bottom:40}}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="nombre" angle={-28} textAnchor="end" interval={0} height={65} tick={{fontSize:10}}/><YAxis tick={{fontSize:10}}/><Tooltip formatter={v=>/monto|total|costo|aporte|provision|aguinaldo|retenido|devengado|liquido/i.test(clave)?money(Number(v)):Number(v).toLocaleString('es-BO')}/><Bar dataKey="valor" fill="#15803d" radius={[6,6,0,0]}/></BarChart></ResponsiveContainer>:<div className="grid h-full place-items-center text-sm text-stone-500">No hay filas para graficar.</div>}</div></section>
      <section className="card overflow-hidden"><div className="border-b px-4 py-3 font-semibold">{nombres[tab]} <span className="ml-1 text-xs font-normal text-stone-400">({filas.length})</span></div><div className="max-h-[32rem] overflow-auto">{filas.length?<table className="w-full min-w-max text-left text-sm"><thead className="sticky top-0 bg-stone-50 text-[11px] uppercase text-stone-500"><tr>{campos.map(c=><th key={c} className="px-3 py-3">{etiqueta(c)}</th>)}</tr></thead><tbody className="divide-y">{filas.map((f,i)=><tr key={String(f.empleadoId??f.periodoId??i)} className="hover:bg-brand-50/30">{campos.map(c=><td key={c} className="whitespace-nowrap px-3 py-3">{formato(c,f[c])}</td>)}</tr>)}</tbody></table>:!consulta.isLoading&&<div className="p-12 text-center text-sm text-stone-500">No hay registros para los filtros elegidos.</div>}</div></section></div>
  </>;
}

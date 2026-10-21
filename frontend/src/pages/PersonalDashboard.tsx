import { useQuery } from '@tanstack/react-query';
import { Banknote, Cake, CalendarClock, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { money } from '../lib/utils';
import { personalService } from '../services/personal.service';

const gestionActual = new Date().getFullYear();
const mesActual = new Date().getMonth() + 1;
const fechaLocal = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/La_Paz', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

export function PersonalDashboard() {
  const empleados = useQuery({ queryKey: ['personal', 'empleados', 'dashboard'], queryFn: () => personalService.empleados({ pagina: 1, limite: 100 }) });
  const activos = useQuery({ queryKey: ['personal', 'activos', 'dashboard'], queryFn: () => personalService.empleados({ pagina: 1, limite: 100, estado: 'activo' }) });
  const planilla = useQuery({ queryKey: ['personal', 'planillas-mes', gestionActual, mesActual], queryFn: () => personalService.planillasMes(gestionActual, mesActual) });
  const periodos = useQuery({ queryKey: ['personal', 'periodos', gestionActual], queryFn: () => personalService.periodos(gestionActual) });
  const totalEmpleados = empleados.data?.meta.total ?? 0;
  const totalActivos = activos.data?.meta.total ?? 0;
  const cumpleaneros = (activos.data?.data ?? []).filter(e => e.fechaNacimiento?.slice(5, 7) === String(mesActual).padStart(2, '0')).sort((a, b) => (a.fechaNacimiento ?? '').slice(8).localeCompare((b.fechaNacimiento ?? '').slice(8)));
  const proximoPeriodo = (periodos.data?.data ?? []).filter(p => p.fechaInicio >= fechaLocal && (p.estado === 'abierto' || p.estado === 'calculado')).sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio))[0];
  const proximosPagos = (periodos.data?.data ?? []).filter(p => p.fechaPago && p.fechaPago >= fechaLocal && p.estado !== 'pagado').sort((a, b) => (a.fechaPago ?? '').localeCompare(b.fechaPago ?? '')).slice(0, 4);
  const tarjetas = [
    { titulo: 'Empleados registrados', valor: String(totalEmpleados), nota: 'Personal en el sistema', icono: Users, tono: 'bg-sky-50 text-sky-700' },
    { titulo: 'Empleados activos', valor: String(totalActivos), nota: 'Disponibles para asignación', icono: Users, tono: 'bg-emerald-50 text-emerald-700' },
    { titulo: 'Líquido de planilla del mes', valor: money(planilla.data?.data.resumen.liquidoPagable ?? 0), nota: `${planilla.data?.data.resumen.planillas ?? 0} planillas calculadas`, icono: Banknote, tono: 'bg-amber-50 text-amber-700' },
    { titulo: 'Próximo período abierto', valor: proximoPeriodo?`${String(proximoPeriodo.mes).padStart(2,'0')}/${proximoPeriodo.gestion}`:'Sin programar', nota: proximoPeriodo?`Inicia ${proximoPeriodo.fechaInicio}`:'Crea un período de planilla', icono: CalendarClock, tono: 'bg-violet-50 text-violet-700' },
  ];
  return <div className="space-y-6">
    <PageHeader title="Personal" description="Resumen de empleados, planillas y fechas importantes." action={<Link className="btn-primary" to="/personal/empleados">Ver empleados</Link>} />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{tarjetas.map(t => <div key={t.titulo} className="card p-5"><div className="flex items-start gap-4"><span className={`grid size-11 place-items-center rounded-2xl ${t.tono}`}><t.icono size={21}/></span><div><p className="text-sm text-stone-500">{t.titulo}</p><p className="mt-1 font-display text-2xl font-bold text-stone-900">{empleados.isLoading||activos.isLoading||planilla.isLoading?'…':t.valor}</p><p className="mt-1 text-xs text-stone-400">{t.nota}</p></div></div></div>)}</div>
    {(empleados.isError||activos.isError||planilla.isError||periodos.isError)&&<div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">No se pudieron cargar todos los indicadores. Actualiza la pantalla o verifica tu acceso.</div>}
    <div className="grid gap-6 xl:grid-cols-2">
      <section className="card overflow-hidden"><div className="flex items-center gap-3 border-b px-5 py-4"><Cake className="text-amber-600" size={19}/><div><h2 className="font-display font-bold">Cumpleaños del mes</h2><p className="text-xs text-stone-500">{cumpleaneros.length} empleados activos</p></div></div><div className="divide-y">{cumpleaneros.slice(0,6).map(e=><div key={e.id} className="flex items-center justify-between px-5 py-3.5"><div><p className="font-semibold">{e.nombres} {e.apellidos}</p><p className="text-xs text-stone-500">{e.cargo}</p></div><span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-800">{e.fechaNacimiento?.slice(8,10)}/{e.fechaNacimiento?.slice(5,7)}</span></div>)}{!cumpleaneros.length&&<p className="px-5 py-10 text-center text-sm text-stone-400">No hay cumpleaños registrados este mes.</p>}</div></section>
      <section className="card overflow-hidden"><div className="flex items-center gap-3 border-b px-5 py-4"><CalendarClock className="text-violet-600" size={19}/><div><h2 className="font-display font-bold">Fechas de pago próximas</h2><p className="text-xs text-stone-500">Períodos aún pendientes de pago</p></div></div><div className="divide-y">{proximosPagos.map(p=><div key={p.id} className="flex items-center justify-between px-5 py-3.5"><div><p className="font-semibold">{p.tipo==='mensual'?'Planilla mensual':`Planilla quincenal · ${p.quincena}ª`}</p><p className="text-xs text-stone-500">{String(p.mes).padStart(2,'0')}/{p.gestion} · {p.estado}</p></div><span className="rounded-full bg-violet-50 px-3 py-1 text-sm font-semibold text-violet-800">{p.fechaPago}</span></div>)}{!proximosPagos.length&&<p className="px-5 py-10 text-center text-sm text-stone-400">No hay pagos próximos registrados.</p>}</div></section>
    </div>
  </div>;
}

import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Download } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '../components/PageHeader';
import { Button, Input } from '../components/ui';
import { descargarCsv } from '../lib/export';
import { reportesCampoService, type ReporteCampo } from '../services/seguimiento.service';

type TabReporte = 'superficie' | 'actividades' | 'costos' | 'productividad';
const moneda = (valor: unknown) => `Bs. ${Number(valor ?? 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const nombreParcela = (fila: ReporteCampo) => String(fila.parcela ?? fila.cultivo ?? '');

export function ReportesCampo() {
  const [tab, setTab] = useState<TabReporte>('superficie'); const [desde, setDesde] = useState(''); const [hasta, setHasta] = useState('');
  const superficie = useQuery({ queryKey: ['reportes-campo', 'superficie'], queryFn: () => reportesCampoService.superficiePorCultivo().then((r) => r.data), enabled: tab === 'superficie' });
  const actividades = useQuery({ queryKey: ['reportes-campo', 'actividades', desde, hasta], queryFn: () => reportesCampoService.actividadesPorParcela({ desde: desde || undefined, hasta: hasta || undefined }).then((r) => r.data), enabled: tab === 'actividades' });
  const costos = useQuery({ queryKey: ['reportes-campo', 'costos', desde, hasta], queryFn: () => reportesCampoService.costosPorParcela({ desde: desde || undefined, hasta: hasta || undefined }).then((r) => r.data), enabled: tab === 'costos' });
  const productividad = useQuery({ queryKey: ['reportes-campo', 'productividad', desde, hasta], queryFn: () => reportesCampoService.productividadPorCultivo({ desde: desde || undefined, hasta: hasta || undefined }).then((r) => r.data), enabled: tab === 'productividad' });
  const fuente = tab === 'superficie' ? superficie : tab === 'actividades' ? actividades : tab === 'costos' ? costos : productividad;
  const filas = fuente.data ?? [];
  const exportar = () => {
    if (!filas.length) { toast.info('No hay filas para exportar.'); return; }
    const columnas = Object.keys(filas[0]!); descargarCsv(`reporte_campo_${tab}`, columnas, filas.map((fila) => columnas.map((columna) => fila[columna] == null ? '' : String(fila[columna])))); toast.success('CSV descargado.');
  };
  const tabs: Array<[TabReporte, string]> = [['superficie', 'Superficie por cultivo'], ['actividades', 'Actividades por parcela'], ['costos', 'Costos por parcela'], ['productividad', 'Productividad por cultivo']];
  const campoGrafico = tab === 'superficie' ? 'superficieHectareas' : tab === 'actividades' ? 'cantidadActividades' : tab === 'costos' ? 'costoTotal' : 'rendimientoTotal';
  const tituloCampo = tab === 'superficie' ? 'Superficie (ha)' : tab === 'actividades' ? 'Actividades' : tab === 'costos' ? 'Costo total (Bs.)' : 'Rendimiento total';
  const datosGrafico = filas.slice(0, 15).map((fila) => ({ nombre: nombreParcela(fila), valor: Number(fila[campoGrafico] ?? 0) }));
  return <div><PageHeader title="Reportes de campo" description="Superficie cultivada, labores, costos y productividad." action={<Button variant="secondary" onClick={exportar}><Download size={16}/>Exportar CSV</Button>}/>
    <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between"><div className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-xl border bg-white p-1">{tabs.map(([valor, etiqueta]) => <button key={valor} onClick={() => setTab(valor)} className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold ${tab === valor ? 'bg-brand-700 text-white' : 'text-stone-500 hover:bg-stone-50'}`}>{etiqueta}</button>)}</div>{tab !== 'superficie' && <div className="flex gap-2"><Input aria-label="Desde" type="date" value={desde} onChange={(e) => setDesde(e.target.value)}/><Input aria-label="Hasta" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)}/></div>}</div>
    {fuente.isError && <div className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{fuente.error.message}</div>}
    <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr]"><section className="card p-4"><h3 className="mb-3 font-semibold">{tituloCampo}</h3><div className="h-80">{fuente.isLoading ? <div className="grid h-full place-items-center text-sm text-stone-500">Cargando reporte…</div> : datosGrafico.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={datosGrafico} margin={{ top: 8, right: 12, left: 4, bottom: 36 }}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="nombre" angle={-25} textAnchor="end" interval={0} height={56} tick={{ fontSize: 11 }}/><YAxis tick={{ fontSize: 11 }}/><Tooltip formatter={(valor) => tab === 'costos' ? moneda(valor) : Number(valor).toLocaleString('es-BO')}/><Bar dataKey="valor" fill="#15803d" radius={[6, 6, 0, 0]}/></BarChart></ResponsiveContainer> : <div className="grid h-full place-items-center text-sm text-stone-500">No hay datos en este reporte.</div>}</div></section>
      <section className="card overflow-hidden"><div className="border-b px-4 py-3 font-semibold">Detalle del reporte <span className="ml-1 text-xs font-normal text-stone-400">({filas.length})</span></div><div className="max-h-[22rem] overflow-auto"><table className="w-full text-left text-sm"><thead className="sticky top-0 bg-stone-50 text-xs uppercase text-stone-500"><tr><th className="px-4 py-3">Concepto</th><th className="px-4 py-3">Detalle</th></tr></thead><tbody className="divide-y">{filas.map((fila, i) => <tr key={`${nombreParcela(fila)}-${i}`}><td className="px-4 py-3 font-medium">{nombreParcela(fila) || String(fila.parcelaId ?? '—')}</td><td className="px-4 py-3 text-xs text-stone-600">{Object.entries(fila).filter(([key]) => !['parcelaId', 'cultivoId', 'parcela', 'cultivo'].includes(key)).map(([key, valor]) => `${key}: ${tab === 'costos' && key.toLowerCase().includes('costo') ? moneda(valor) : String(valor ?? '—')}`).join(' · ')}</td></tr>)}</tbody></table>{!fuente.isLoading && !filas.length && <p className="p-6 text-center text-sm text-stone-500">Sin registros.</p>}</div></section></div>
  </div>;
}

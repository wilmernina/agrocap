import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import type { GeoJsonObject } from 'geojson';
import L, { type Layer } from 'leaflet';
import { AlertTriangle, Layers3, MapPin, Search, Sprout } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button, Field, Input, Modal, Select, Textarea } from '../components/ui';
import { DibujoParcelas } from '../components/DibujoParcelas';
import { campoService, type GeoJsonParcelas, type GeometriaParcela, type ParcelaInput, type PropiedadesParcela } from '../services/campo.service';
import { useAuth } from '../store/auth';

const coloresCultivo = ['#15803d', '#a16207', '#047857', '#65a30d', '#0f766e', '#b45309'];
function colorCultivo(nombre: string | null) {
  if (!nombre) return '#64748b';
  return coloresCultivo[[...nombre].reduce((suma, letra) => suma + letra.charCodeAt(0), 0) % coloresCultivo.length];
}

function ControlesMapa({ geojson }: { geojson: GeoJsonParcelas }) {
  const mapa = useMap();
  useEffect(() => {
    if (!geojson.features.length) return;
    const capa = L.geoJSON(geojson as unknown as GeoJsonObject);
    mapa.fitBounds(capa.getBounds(), { padding: [28, 28], maxZoom: 16 });
  }, [geojson, mapa]);
  return null;
}

export function Mapa() {
  const queryClient = useQueryClient();
  const rol = useAuth((estado) => estado.user?.role);
  const puedeEditar = rol === 'admin' || rol === 'tecnico';
  const [mostrarParcelas, setMostrarParcelas] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [seleccionada, setSeleccionada] = useState<string | null>(null);
  const [geometriaNueva, setGeometriaNueva] = useState<GeometriaParcela | null>(null);
  const [capaTemporal, setCapaTemporal] = useState<Layer | null>(null);
  const [superficieDibujo, setSuperficieDibujo] = useState<number | null>(null);
  const [formulario, setFormulario] = useState({ fincaId: '', nombre: '', codigo: '', tipoSuelo: '', sistemaRiego: '', observaciones: '' });
  const consulta = useQuery({ queryKey: ['campo', 'parcelas-geojson'], queryFn: () => campoService.geojsonParcelas({ activo: true }) });
  const fincas = useQuery({ queryKey: ['campo', 'fincas-activas'], queryFn: campoService.listarFincas });
  const geojson = consulta.data;
  const crearParcela = useMutation({
    mutationFn: campoService.crearParcela,
    onSuccess: async () => {
      toast.success('Parcela creada correctamente.');
      capaTemporal?.remove();
      setCapaTemporal(null);
      setGeometriaNueva(null);
      setSuperficieDibujo(null);
      setFormulario({ fincaId: '', nombre: '', codigo: '', tipoSuelo: '', sistemaRiego: '', observaciones: '' });
      await queryClient.invalidateQueries({ queryKey: ['campo', 'parcelas-geojson'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const alDibujar = useCallback((geometria: GeometriaParcela, superficie: number, capa: Layer) => {
    setGeometriaNueva(geometria);
    setCapaTemporal(capa);
    setSuperficieDibujo(superficie);
  }, []);
  const alEditar = useCallback(async (id: string, geometria: GeometriaParcela) => {
    await campoService.actualizarParcela(id, { geometria });
    toast.success('Geometría de parcela actualizada.');
    await queryClient.invalidateQueries({ queryKey: ['campo', 'parcelas-geojson'] });
  }, [queryClient]);
  const guardarParcela = (evento: React.FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    if (!geometriaNueva) return;
    const datos: ParcelaInput = {
      fincaId: formulario.fincaId, nombre: formulario.nombre.trim(), codigo: formulario.codigo.trim(), geometria: geometriaNueva,
      tipoSuelo: formulario.tipoSuelo.trim() || undefined, sistemaRiego: formulario.sistemaRiego.trim() || undefined,
      observaciones: formulario.observaciones.trim() || undefined, activo: true,
    };
    crearParcela.mutate(datos);
  };
  const filtradas = useMemo(() => (geojson?.features ?? []).filter(({ properties }) =>
    `${properties.nombre} ${properties.codigo} ${properties.finca} ${properties.cultivoActual ?? ''}`.toLocaleLowerCase().includes(busqueda.toLocaleLowerCase().trim())), [geojson, busqueda]);

  return <section className="relative -m-4 h-[calc(100dvh-5.25rem)] overflow-hidden bg-stone-100 sm:-m-6 lg:-m-8">
    <MapContainer center={[-17.2, -64.8]} zoom={5} scrollWheelZoom className="z-0 h-full w-full">
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {geojson && <><ControlesMapa geojson={geojson} /><DibujoParcelas geojson={geojson} mostrar={mostrarParcelas} habilitado={puedeEditar} alDibujar={alDibujar} alEditar={alEditar} alCambiarSuperficie={setSuperficieDibujo} alSeleccionar={setSeleccionada} /></>}
    </MapContainer>

    <aside className="absolute left-3 top-3 z-[500] flex max-h-[calc(100%-1.5rem)] w-[min(21rem,calc(100%-1.5rem))] flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white/95 shadow-xl backdrop-blur sm:left-5 sm:top-5">
      <div className="border-b border-stone-100 p-4">
        <div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Gestión de campo</p><h2 className="mt-1 text-lg font-bold text-stone-900">Mapa de parcelas</h2></div><span className="rounded-xl bg-emerald-50 p-2 text-emerald-700"><MapPin size={19}/></span></div>
        <label className="relative mt-4 block"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"/><input value={busqueda} onChange={(evento) => setBusqueda(evento.target.value)} placeholder="Buscar parcela, finca o cultivo" className="h-10 w-full rounded-xl border border-stone-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-emerald-500"/></label>
        <button onClick={() => setMostrarParcelas((valor) => !valor)} className="mt-3 flex w-full items-center gap-2 rounded-xl bg-stone-50 px-3 py-2.5 text-left text-sm font-semibold text-stone-700 hover:bg-stone-100"><Layers3 size={16} className="text-emerald-700"/>Parcelas<span className={`ml-auto h-5 w-9 rounded-full p-0.5 transition ${mostrarParcelas ? 'bg-emerald-600' : 'bg-stone-300'}`}><span className={`block size-4 rounded-full bg-white transition ${mostrarParcelas ? 'translate-x-4' : ''}`}/></span></button>
        {puedeEditar && <p className="mt-2 text-xs text-stone-500">Usa las herramientas del mapa para dibujar parcelas o editar sus vértices.</p>}
        {superficieDibujo !== null && <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">Superficie dibujada: {(superficieDibujo / 10_000).toFixed(3)} ha · {(superficieDibujo).toLocaleString('es-BO', { maximumFractionDigits: 0 })} m²</p>}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {consulta.isPending && <p className="p-4 text-sm text-stone-500">Cargando parcelas…</p>}
        {consulta.isError && <div className="m-2 rounded-xl bg-red-50 p-3 text-sm text-red-800"><AlertTriangle size={17} className="mb-1"/>No se pudieron cargar las parcelas. {consulta.error.message}</div>}
        {consulta.isSuccess && filtradas.length === 0 && <p className="p-4 text-sm text-stone-500">{geojson?.features.length ? 'No hay coincidencias.' : 'Todavía no hay parcelas registradas.'}</p>}
        {filtradas.map((elemento) => <button key={elemento.id} onClick={() => setSeleccionada(elemento.id)} className={`w-full rounded-xl p-3 text-left hover:bg-stone-50 ${seleccionada === elemento.id ? 'bg-emerald-50' : ''}`}>
          <span className="flex items-start gap-2.5"><span className="mt-0.5 rounded-lg p-1.5 text-white" style={{ backgroundColor: colorCultivo(elemento.properties.cultivoActual) }}><Sprout size={14}/></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-stone-800">{elemento.properties.nombre}</span><span className="mt-0.5 block truncate text-xs text-stone-500">{elemento.properties.finca} · {elemento.properties.codigo}</span><span className="mt-1 block text-xs text-stone-500">{elemento.properties.cultivoActual ?? 'Sin cultivo'} · {(Number(elemento.properties.superficieCalculada) / 10_000).toFixed(2)} ha</span></span></span>
        </button>)}
      </div>
      <div className="border-t border-stone-100 px-4 py-2 text-xs text-stone-500">{geojson?.meta.total ?? 0} parcelas · colores por cultivo actual</div>
    </aside>
    <Modal open={geometriaNueva !== null} onOpenChange={(abierto) => { if (!abierto) { capaTemporal?.remove(); setCapaTemporal(null); setGeometriaNueva(null); setSuperficieDibujo(null); } }} title="Nueva parcela" description="Completa los datos de la parcela dibujada en el mapa." size="md">
      <form onSubmit={guardarParcela} className="space-y-4">
        {superficieDibujo !== null && <div className="rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">Área estimada: {(superficieDibujo / 10_000).toFixed(3)} ha ({superficieDibujo.toLocaleString('es-BO', { maximumFractionDigits: 0 })} m²)</div>}
        <Field label="Finca"><Select required value={formulario.fincaId} onChange={(evento) => setFormulario((estado) => ({ ...estado, fincaId: evento.target.value }))}><option value="">Selecciona una finca</option>{fincas.data?.data.map((finca) => <option key={finca.id} value={finca.id}>{finca.nombre}</option>)}</Select></Field>
        {fincas.isError && <p className="text-sm text-red-600">No se pudieron cargar las fincas: {fincas.error.message}</p>}
        <div className="grid gap-4 sm:grid-cols-2"><Field label="Nombre"><Input required minLength={2} maxLength={160} value={formulario.nombre} onChange={(evento) => setFormulario((estado) => ({ ...estado, nombre: evento.target.value }))} placeholder="Ej. Parcela Norte"/></Field><Field label="Código"><Input required maxLength={60} value={formulario.codigo} onChange={(evento) => setFormulario((estado) => ({ ...estado, codigo: evento.target.value }))} placeholder="Ej. SC-001"/></Field></div>
        <div className="grid gap-4 sm:grid-cols-2"><Field label="Tipo de suelo"><Input maxLength={120} value={formulario.tipoSuelo} onChange={(evento) => setFormulario((estado) => ({ ...estado, tipoSuelo: evento.target.value }))} placeholder="Ej. Franco arcilloso"/></Field><Field label="Sistema de riego"><Input maxLength={120} value={formulario.sistemaRiego} onChange={(evento) => setFormulario((estado) => ({ ...estado, sistemaRiego: evento.target.value }))} placeholder="Ej. Goteo"/></Field></div>
        <Field label="Observaciones"><Textarea maxLength={5000} value={formulario.observaciones} onChange={(evento) => setFormulario((estado) => ({ ...estado, observaciones: evento.target.value }))} placeholder="Notas sobre el terreno"/></Field>
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setGeometriaNueva(null)}>Cancelar</Button><Button type="submit" loading={crearParcela.isPending} disabled={!fincas.data?.data.length}>Guardar parcela</Button></div>
      </form>
    </Modal>
  </section>;
}

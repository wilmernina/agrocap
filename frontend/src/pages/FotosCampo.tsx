import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, MapPin, Plus, Trash2 } from 'lucide-react';
import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '../components/PageHeader';
import { Button, Field, Input, Modal, Select, Textarea } from '../components/ui';
import { urlFoto } from '../lib/url-foto';
import { seguimientoService, type FotoCampo } from '../services/seguimiento.service';
import { useAuth } from '../store/auth';

type PuntoFoto = Awaited<ReturnType<typeof seguimientoService.geojsonFotos>>['features'][number];

export function FotosCampo() {
  const cache = useQueryClient(); const rol = useAuth((s) => s.user?.role); const puedeEliminar = rol === 'admin' || rol === 'tecnico';
  const [parcela, setParcela] = useState(''); const [desde, setDesde] = useState(''); const [hasta, setHasta] = useState(''); const [modal, setModal] = useState(false); const [seleccionada, setSeleccionada] = useState<FotoCampo | null>(null); const [vista, setVista] = useState<'galeria' | 'mapa'>('galeria');
  const [archivo, setArchivo] = useState<File | null>(null); const [vistaPrevia, setVistaPrevia] = useState('');
  const [form, setForm] = useState({ parcelaId: '', latitud: '', longitud: '', altitud: '', precisionGps: '', fechaCaptura: new Date().toISOString().slice(0, 16), descripcion: '', etiquetas: '' });
  const lista = useQuery({ queryKey: ['campo', 'fotos', parcela, desde, hasta], queryFn: () => seguimientoService.fotos({ parcela: parcela || undefined, desde: desde || undefined, hasta: hasta || undefined }) });
  const parcelas = useQuery({ queryKey: ['campo', 'parcelas-selector'], queryFn: seguimientoService.parcelas });
  const mapaFotos = useQuery({ queryKey: ['campo', 'fotos-geojson'], queryFn: seguimientoService.geojsonFotos, enabled: vista === 'mapa' });
  useEffect(() => { if (!archivo) { setVistaPrevia(''); return; } const url = URL.createObjectURL(archivo); setVistaPrevia(url); return () => URL.revokeObjectURL(url); }, [archivo]);
  const subir = useMutation({ mutationFn: () => {
    const datos = new FormData(); datos.append('foto', archivo!); datos.append('parcelaId', form.parcelaId); datos.append('latitud', form.latitud); datos.append('longitud', form.longitud);
    if (form.altitud) datos.append('altitud', form.altitud); if (form.precisionGps) datos.append('precisionGps', form.precisionGps); if (form.fechaCaptura) datos.append('fechaCaptura', new Date(form.fechaCaptura).toISOString());
    if (form.descripcion) datos.append('descripcion', form.descripcion); if (form.etiquetas) datos.append('etiquetas', form.etiquetas);
    return seguimientoService.crearFoto(datos);
  }, onSuccess: async () => { toast.success('Foto guardada con sus coordenadas.'); setModal(false); setArchivo(null); await cache.invalidateQueries({ queryKey: ['campo', 'fotos'] }); }, onError: (e: Error) => toast.error(e.message) });
  const eliminar = useMutation({ mutationFn: seguimientoService.eliminarFoto, onSuccess: async () => { toast.success('Foto eliminada.'); setSeleccionada(null); await cache.invalidateQueries({ queryKey: ['campo', 'fotos'] }); }, onError: (e: Error) => toast.error(e.message) });
  const filas = useMemo(() => lista.data?.data ?? [], [lista.data]);
  const gruposMapa = useMemo(() => {
    const grupos = new Map<string, PuntoFoto[]>();
    for (const punto of mapaFotos.data?.features ?? []) {
      const [longitud, latitud] = punto.geometry.coordinates;
      const clave = `${latitud.toFixed(2)}:${longitud.toFixed(2)}`;
      const grupo = grupos.get(clave) ?? [];
      grupo.push(punto);
      grupos.set(clave, grupo);
    }
    return [...grupos.values()];
  }, [mapaFotos.data]);
  const capturarGps = () => {
    if (!navigator.geolocation) { toast.error('Este navegador no ofrece geolocalización.'); return; }
    navigator.geolocation.getCurrentPosition((posicion) => setForm((actual) => ({ ...actual, latitud: String(posicion.coords.latitude), longitud: String(posicion.coords.longitude), altitud: posicion.coords.altitude == null ? '' : String(posicion.coords.altitude), precisionGps: String(Math.round(posicion.coords.accuracy)) })), () => toast.error('No se pudo obtener GPS. Ingresa las coordenadas manualmente.'), { enableHighAccuracy: true, timeout: 15000 });
  };
  const abrirCarga = () => { setForm({ parcelaId: parcela, latitud: '', longitud: '', altitud: '', precisionGps: '', fechaCaptura: new Date().toISOString().slice(0, 16), descripcion: '', etiquetas: '' }); setArchivo(null); setModal(true); };
  return <div><PageHeader title="Galería de fotos" description="Fotos de campo con ubicación y fecha de captura." action={<Button onClick={abrirCarga}><Plus size={16}/>Subir foto</Button>}/>
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end"><div className="grid flex-1 gap-3 sm:grid-cols-3"><Field label="Parcela"><Select value={parcela} onChange={(e) => setParcela(e.target.value)}><option value="">Todas las parcelas</option>{parcelas.data?.data.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}</Select></Field><Field label="Desde"><Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)}/></Field><Field label="Hasta"><Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)}/></Field></div><div className="flex rounded-xl border bg-white p-1"><button onClick={() => setVista('galeria')} className={`rounded-lg px-3 py-2 text-sm font-semibold ${vista === 'galeria' ? 'bg-brand-700 text-white' : 'text-stone-500'}`}>Galería</button><button onClick={() => setVista('mapa')} className={`rounded-lg px-3 py-2 text-sm font-semibold ${vista === 'mapa' ? 'bg-brand-700 text-white' : 'text-stone-500'}`}>Mapa</button></div></div>
    {vista === 'mapa' ? <div className="card h-[65vh] overflow-hidden">{mapaFotos.isLoading ? <div className="grid h-full place-items-center text-stone-500">Cargando ubicaciones…</div> : <MapContainer center={[-17.2, -64.8]} zoom={5} className="h-full w-full"><TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>{gruposMapa.map((grupo) => { const longitud = grupo.reduce((s, f) => s + f.geometry.coordinates[0], 0) / grupo.length; const latitud = grupo.reduce((s, f) => s + f.geometry.coordinates[1], 0) / grupo.length; const icono = L.divIcon({ className: 'foto-cluster', html: `<span>${grupo.length}</span>`, iconSize: [34, 34], iconAnchor: [17, 17] }); return <Marker key={`${latitud}-${longitud}`} position={[latitud, longitud]} icon={icono}><Popup><div className="max-h-64 w-56 overflow-y-auto">{grupo.map((f) => <a key={f.id} className="mb-2 flex gap-2" href={urlFoto(f.properties.foto)} target="_blank" rel="noreferrer"><img className="size-12 rounded object-cover" src={urlFoto(f.properties.miniatura)} alt=""/><span className="text-xs">{f.properties.descripcion || 'Foto de campo'}<br/>{f.properties.fechaCaptura ? new Date(f.properties.fechaCaptura).toLocaleDateString('es-BO') : ''}</span></a>)}</div></Popup></Marker>; })}</MapContainer>}</div> : lista.isLoading ? <div className="card p-8 text-center text-sm text-stone-500">Cargando fotografías…</div> : lista.isError ? <div className="card p-8 text-center text-sm text-red-700">{lista.error.message}</div> : filas.length === 0 ? <div className="card p-12 text-center"><Camera className="mx-auto text-stone-400"/><p className="mt-3 font-semibold">No hay fotos de campo</p><p className="mt-1 text-sm text-stone-500">Las imágenes subidas aparecerán aquí.</p></div> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{filas.map((foto) => <article key={foto.id} className="card overflow-hidden"><button className="block aspect-[4/3] w-full overflow-hidden bg-stone-100" onClick={() => setSeleccionada(foto)}><img src={urlFoto(foto.archivoThumbUrl)} alt={foto.descripcion ?? 'Foto de campo'} className="h-full w-full object-cover transition hover:scale-[1.03]" loading="lazy"/></button><div className="p-3"><p className="truncate text-sm font-semibold">{foto.descripcion || 'Foto de campo'}</p><p className="mt-1 text-xs text-stone-500">{foto.fechaCaptura ? new Date(foto.fechaCaptura).toLocaleString('es-BO') : new Date(foto.createdAt).toLocaleString('es-BO')}</p><p className="mt-1 flex items-center gap-1 text-xs text-stone-500"><MapPin size={12}/>{Number(foto.latitud).toFixed(5)}, {Number(foto.longitud).toFixed(5)}</p></div></article>)}</div>}
    <Modal open={modal} onOpenChange={setModal} title="Subir foto de campo" description="Captura GPS o ingresa las coordenadas manualmente." size="lg"><form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); subir.mutate(); }}>
      <div className="sm:col-span-2"><Field label="Archivo (JPG, PNG o WebP)"><Input required type="file" accept="image/jpeg,image/png,image/webp" className="h-auto py-2" onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}/></Field></div>
      {vistaPrevia && <div className="sm:col-span-2"><img src={vistaPrevia} alt="Vista previa de foto" className="max-h-56 rounded-xl object-contain"/></div>}
      <div className="sm:col-span-2"><Field label="Parcela"><Select required value={form.parcelaId} onChange={(e) => setForm((d) => ({ ...d, parcelaId: e.target.value }))}><option value="">Selecciona una parcela</option>{parcelas.data?.data.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}</Select></Field></div>
      <div className="flex items-end sm:col-span-2"><Button type="button" variant="secondary" onClick={capturarGps}><MapPin size={16}/>Capturar GPS</Button></div>
      <Field label="Latitud"><Input required type="number" min="-90" max="90" step="any" value={form.latitud} onChange={(e) => setForm((d) => ({ ...d, latitud: e.target.value }))}/></Field><Field label="Longitud"><Input required type="number" min="-180" max="180" step="any" value={form.longitud} onChange={(e) => setForm((d) => ({ ...d, longitud: e.target.value }))}/></Field>
      <Field label="Altitud (m)"><Input type="number" value={form.altitud} onChange={(e) => setForm((d) => ({ ...d, altitud: e.target.value }))}/></Field><Field label="Precisión GPS (m)"><Input type="number" min="0" value={form.precisionGps} onChange={(e) => setForm((d) => ({ ...d, precisionGps: e.target.value }))}/></Field>
      <Field label="Fecha de captura"><Input type="datetime-local" value={form.fechaCaptura} onChange={(e) => setForm((d) => ({ ...d, fechaCaptura: e.target.value }))}/></Field><Field label="Etiquetas (separadas por coma)"><Input value={form.etiquetas} onChange={(e) => setForm((d) => ({ ...d, etiquetas: e.target.value }))} placeholder="floración, parcela norte"/></Field>
      <div className="sm:col-span-2"><Field label="Descripción"><Textarea maxLength={2000} value={form.descripcion} onChange={(e) => setForm((d) => ({ ...d, descripcion: e.target.value }))}/></Field></div>
      <div className="flex justify-end gap-2 sm:col-span-2"><Button type="button" variant="secondary" onClick={() => setModal(false)}>Cancelar</Button><Button loading={subir.isPending} disabled={!archivo}>Guardar foto</Button></div>
    </form></Modal>
    <Modal open={seleccionada !== null} onOpenChange={(abierto) => !abierto && setSeleccionada(null)} title={seleccionada?.descripcion || 'Foto de campo'} size="lg">{seleccionada && <div><img src={urlFoto(seleccionada.archivoUrl)} alt={seleccionada.descripcion ?? 'Foto de campo'} className="max-h-[65vh] w-full rounded-xl bg-stone-50 object-contain"/><p className="mt-3 text-sm text-stone-600">Coordenadas: {seleccionada.latitud}, {seleccionada.longitud}</p>{puedeEliminar && <Button variant="danger" className="mt-3" loading={eliminar.isPending} onClick={() => eliminar.mutate(seleccionada.id)}><Trash2 size={16}/>Eliminar foto</Button>}</div>}</Modal>
  </div>;
}

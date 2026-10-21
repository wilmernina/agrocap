import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { DataTable } from '../components/DataTable';
import { PageHeader } from '../components/PageHeader';
import { Button, Field, Input, Modal, Select } from '../components/ui';
import { seguimientoService, type Cultivo, type CultivoDatos, type Finca, type FincaDatos } from '../services/seguimiento.service';

export function Fincas() {
  const cliente = useQueryClient();
  const [actual, setActual] = useState<Finca | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [datos, setDatos] = useState<FincaDatos>({ nombre: '', municipio: '', departamento: '', direccion: '', activo: true });
  const lista = useQuery({ queryKey: ['campo', 'fincas'], queryFn: () => seguimientoService.fincas({ pagina: 1, limite: 100 }) });
  const recargar = () => cliente.invalidateQueries({ queryKey: ['campo', 'fincas'] });
  const guardar = useMutation({ mutationFn: () => actual ? seguimientoService.actualizarFinca(actual.id, datos) : seguimientoService.crearFinca(datos), onSuccess: async () => { toast.success(actual ? 'Finca actualizada.' : 'Finca creada.'); setAbierto(false); await recargar(); }, onError: (e: Error) => toast.error(e.message) });
  const eliminar = useMutation({ mutationFn: seguimientoService.desactivarFinca, onSuccess: async () => { toast.success('Finca desactivada.'); await recargar(); }, onError: (e: Error) => toast.error(e.message) });
  const abrir = (finca?: Finca) => { setActual(finca ?? null); setDatos(finca ? { nombre: finca.nombre, direccion: finca.direccion ?? '', municipio: finca.municipio ?? '', departamento: finca.departamento ?? '', activo: finca.activo } : { nombre: '', direccion: '', municipio: '', departamento: '', activo: true }); setAbierto(true); };
  const columnas = useMemo<ColumnDef<Finca>[]>(() => [
    { header: 'Finca', cell: ({ row }) => <div><strong>{row.original.nombre}</strong><p className="text-xs text-stone-500">{[row.original.municipio, row.original.departamento].filter(Boolean).join(', ') || 'Ubicación pendiente'}</p></div> },
    { header: 'Superficie declarada', cell: ({ row }) => `${Number(row.original.superficieTotal).toLocaleString('es-BO')} m²` },
    { header: 'Estado', cell: ({ row }) => <span className={`badge ${row.original.activo ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-500'}`}>{row.original.activo ? 'Activa' : 'Inactiva'}</span> },
    { id: 'acciones', header: '', cell: ({ row }) => <div className="flex gap-2"><button className="text-sm font-semibold text-emerald-700" onClick={() => abrir(row.original)}>Editar</button>{row.original.activo && <button className="text-sm font-semibold text-red-600" onClick={() => eliminar.mutate(row.original.id)}>Desactivar</button>}</div> },
  ], [eliminar]);
  return <div><PageHeader title="Fincas" description="Administra las propiedades rurales y su ubicación." action={<Button onClick={() => abrir()}><Plus size={16}/>Nueva finca</Button>}/><div className="card overflow-hidden"><DataTable data={lista.data?.data ?? []} columns={columnas} loading={lista.isLoading} empty="No hay fincas registradas"/></div>
    <Modal open={abierto} onOpenChange={setAbierto} title={actual ? 'Editar finca' : 'Nueva finca'} description="Datos generales de la propiedad.">
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); guardar.mutate(); }}>
        <Field label="Nombre"><Input required minLength={2} maxLength={160} value={datos.nombre} onChange={(e) => setDatos((d) => ({ ...d, nombre: e.target.value }))}/></Field>
        <div className="grid gap-4 sm:grid-cols-2"><Field label="Departamento"><Input maxLength={120} value={datos.departamento ?? ''} onChange={(e) => setDatos((d) => ({ ...d, departamento: e.target.value }))}/></Field><Field label="Municipio"><Input maxLength={120} value={datos.municipio ?? ''} onChange={(e) => setDatos((d) => ({ ...d, municipio: e.target.value }))}/></Field></div>
        <Field label="Dirección"><Input maxLength={1000} value={datos.direccion ?? ''} onChange={(e) => setDatos((d) => ({ ...d, direccion: e.target.value }))}/></Field>
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setAbierto(false)}>Cancelar</Button><Button loading={guardar.isPending}>Guardar finca</Button></div>
      </form>
    </Modal>
  </div>;
}

const tiposCultivo = ['granos', 'hortalizas', 'frutales', 'forrajes', 'otros'] as const;
export function Cultivos() {
  const cliente = useQueryClient(); const [abierto, setAbierto] = useState(false); const [actual, setActual] = useState<Cultivo | null>(null);
  const [datos, setDatos] = useState<CultivoDatos>({ nombreComun: '', nombreCientifico: '', variedad: '', tipo: 'otros', cicloDias: null, activo: true });
  const lista = useQuery({ queryKey: ['campo', 'cultivos'], queryFn: () => seguimientoService.cultivos({ pagina: 1, limite: 100 }) });
  const recargar = () => cliente.invalidateQueries({ queryKey: ['campo', 'cultivos'] });
  const guardar = useMutation({ mutationFn: () => actual ? seguimientoService.actualizarCultivo(actual.id, datos) : seguimientoService.crearCultivo(datos), onSuccess: async () => { toast.success(actual ? 'Cultivo actualizado.' : 'Cultivo creado.'); setAbierto(false); await recargar(); }, onError: (e: Error) => toast.error(e.message) });
  const eliminar = useMutation({ mutationFn: seguimientoService.desactivarCultivo, onSuccess: async () => { toast.success('Cultivo desactivado.'); await recargar(); }, onError: (e: Error) => toast.error(e.message) });
  const abrir = (cultivo?: Cultivo) => { setActual(cultivo ?? null); setDatos(cultivo ? { nombreComun: cultivo.nombreComun, nombreCientifico: cultivo.nombreCientifico ?? '', variedad: cultivo.variedad ?? '', tipo: cultivo.tipo, cicloDias: cultivo.cicloDias, activo: cultivo.activo } : { nombreComun: '', nombreCientifico: '', variedad: '', tipo: 'otros', cicloDias: null, activo: true }); setAbierto(true); };
  const columnas = useMemo<ColumnDef<Cultivo>[]>(() => [
    { header: 'Cultivo', cell: ({ row }) => <div><strong>{row.original.nombreComun}</strong><p className="text-xs text-stone-500">{row.original.nombreCientifico || 'Nombre científico no registrado'}</p></div> },
    { header: 'Variedad', accessorKey: 'variedad', cell: ({ row }) => row.original.variedad ?? '—' },
    { header: 'Tipo', cell: ({ row }) => <span className="badge bg-lime-50 capitalize text-lime-800">{row.original.tipo}</span> },
    { header: 'Duración', cell: ({ row }) => row.original.cicloDias ? `${row.original.cicloDias} días` : '—' },
    { id: 'acciones', header: '', cell: ({ row }) => <div className="flex gap-2"><button className="text-sm font-semibold text-emerald-700" onClick={() => abrir(row.original)}>Editar</button>{row.original.activo && <button className="text-sm font-semibold text-red-600" onClick={() => eliminar.mutate(row.original.id)}>Desactivar</button>}</div> },
  ], [eliminar]);
  return <div><PageHeader title="Cultivos" description="Catálogo de especies, variedades y duración de ciclo." action={<Button onClick={() => abrir()}><Plus size={16}/>Nuevo cultivo</Button>}/><div className="card overflow-hidden"><DataTable data={lista.data?.data ?? []} columns={columnas} loading={lista.isLoading} empty="No hay cultivos registrados"/></div>
    <Modal open={abierto} onOpenChange={setAbierto} title={actual ? 'Editar cultivo' : 'Nuevo cultivo'}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); guardar.mutate(); }}>
        <Field label="Nombre común"><Input required maxLength={120} value={datos.nombreComun} onChange={(e) => setDatos((d) => ({ ...d, nombreComun: e.target.value }))}/></Field>
        <div className="grid gap-4 sm:grid-cols-2"><Field label="Nombre científico"><Input maxLength={180} value={datos.nombreCientifico ?? ''} onChange={(e) => setDatos((d) => ({ ...d, nombreCientifico: e.target.value }))}/></Field><Field label="Variedad"><Input maxLength={120} value={datos.variedad ?? ''} onChange={(e) => setDatos((d) => ({ ...d, variedad: e.target.value }))}/></Field></div>
        <div className="grid gap-4 sm:grid-cols-2"><Field label="Tipo"><Select value={datos.tipo} onChange={(e) => setDatos((d) => ({ ...d, tipo: e.target.value }))}>{tiposCultivo.map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}</Select></Field><Field label="Duración estimada (días)"><Input type="number" min="1" max="2000" value={datos.cicloDias ?? ''} onChange={(e) => setDatos((d) => ({ ...d, cicloDias: e.target.value ? Number(e.target.value) : null }))}/></Field></div>
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setAbierto(false)}>Cancelar</Button><Button loading={guardar.isPending}>Guardar cultivo</Button></div>
      </form>
    </Modal>
  </div>;
}

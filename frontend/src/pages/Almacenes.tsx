import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { DataTable } from '../components/DataTable';
import { PageHeader } from '../components/PageHeader';
import { Button, Field, Input, Modal, Textarea } from '../components/ui';
import { almacenesService } from '../services/inventario.service';
import { useAuth } from '../store/auth';
import type { Almacen } from '../types/fase1';

const schema = z.object({
  codigo: z.string().trim().min(2, 'Ingresa un código').max(20),
  nombre: z.string().trim().min(2, 'Ingresa el nombre').max(120),
  direccion: z.string().max(1000),
  activo: z.boolean(),
});
type Formulario = z.infer<typeof schema>;
const inicial: Formulario = { codigo: '', nombre: '', direccion: '', activo: true };

export function Almacenes() {
  const rol = useAuth((state) => state.user?.role);
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [edicion, setEdicion] = useState<Almacen | null>(null);
  const [desactivacion, setDesactivacion] = useState<Almacen | null>(null);
  const consulta = useQuery({ queryKey: ['almacenes-admin'], queryFn: () => almacenesService.listar().then((r) => r.data), enabled: rol === 'admin' });
  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<Formulario>({ resolver: zodResolver(schema), defaultValues: inicial });

  const abrir = (almacen?: Almacen) => {
    setEdicion(almacen ?? null);
    reset(almacen ? { codigo: almacen.codigo, nombre: almacen.nombre, direccion: almacen.direccion ?? '', activo: almacen.activo } : inicial);
    setModal(true);
  };
  const guardar = useMutation({
    mutationFn: (datos: Formulario) => {
      const payload = { ...datos, direccion: datos.direccion.trim() || null };
      return edicion ? almacenesService.actualizar(edicion.id, payload) : almacenesService.crear(payload);
    },
    onSuccess: () => {
      toast.success(edicion ? 'Almacén actualizado' : 'Almacén creado');
      setModal(false);
      void qc.invalidateQueries({ queryKey: ['almacenes-admin'] });
      void qc.invalidateQueries({ queryKey: ['almacenes'] });
      void qc.invalidateQueries({ queryKey: ['campo', 'almacenes-selector'] });
    },
    onError: (error: Error) => setError('root', { message: error.message }),
  });
  const desactivar = useMutation({
    mutationFn: almacenesService.desactivar,
    onSuccess: () => {
      toast.success('Almacén desactivado');
      setDesactivacion(null);
      void qc.invalidateQueries({ queryKey: ['almacenes-admin'] });
      void qc.invalidateQueries({ queryKey: ['almacenes'] });
    },
    onError: (error: Error) => { toast.error(error.message); setDesactivacion(null); },
  });

  const columns = useMemo<ColumnDef<Almacen>[]>(() => [
    { header: 'Código', accessorKey: 'codigo', cell: ({ row }) => <span className="font-mono font-semibold">{row.original.codigo}</span> },
    { header: 'Almacén', cell: ({ row }) => <div><p className="font-semibold">{row.original.nombre}</p><p className="text-xs text-stone-400">{row.original.direccion || 'Sin dirección registrada'}</p></div> },
    { header: 'Estado', cell: ({ row }) => <span className={`badge ${row.original.activo ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-500'}`}>{row.original.activo ? 'Activo' : 'Inactivo'}</span> },
    { id: 'acciones', header: '', cell: ({ row }) => <div className="flex justify-end gap-1"><button aria-label={`Editar ${row.original.nombre}`} className="rounded-lg p-2 text-stone-500 hover:bg-stone-100" onClick={() => abrir(row.original)}><Pencil size={16} /></button>{row.original.activo && <button aria-label={`Desactivar ${row.original.nombre}`} className="rounded-lg p-2 text-red-500 hover:bg-red-50" onClick={() => setDesactivacion(row.original)}><Trash2 size={16} /></button>}</div> },
  ], []);

  if (rol !== 'admin') return <div className="card p-8 text-center text-sm text-stone-600">Solo el administrador puede gestionar almacenes.</div>;

  return <>
    <PageHeader title="Almacenes" description="Crea y administra los almacenes que aparecen en ventas, compras e inventario." action={<Button onClick={() => abrir()}><Plus size={17} />Nuevo almacén</Button>} />
    <div className="card overflow-hidden"><DataTable data={consulta.data ?? []} columns={columns} loading={consulta.isLoading} empty="No hay almacenes registrados" /></div>
    <Modal open={modal} onOpenChange={setModal} title={edicion ? 'Editar almacén' : 'Nuevo almacén'} description="Los almacenes activos estarán disponibles en los selectores de operación.">
      <form onSubmit={handleSubmit((datos) => guardar.mutate(datos))} className="grid gap-4 sm:grid-cols-2">
        <Field label="Código *" error={errors.codigo?.message}><Input {...register('codigo')} placeholder="Ej. SUC-01" maxLength={20} /></Field>
        <Field label="Nombre *" error={errors.nombre?.message}><Input {...register('nombre')} placeholder="Almacén central" maxLength={120} /></Field>
        <div className="sm:col-span-2"><Field label="Dirección"><Textarea {...register('direccion')} placeholder="Dirección o referencia" /></Field></div>
        <label className="flex items-center gap-2 text-sm text-stone-700 sm:col-span-2"><input type="checkbox" {...register('activo')} />Almacén activo</label>
        {errors.root && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700 sm:col-span-2">{errors.root.message}</p>}
        <div className="flex justify-end gap-3 sm:col-span-2"><Button type="button" variant="secondary" onClick={() => setModal(false)}>Cancelar</Button><Button type="submit" loading={guardar.isPending}>Guardar almacén</Button></div>
      </form>
    </Modal>
    <ConfirmDialog open={!!desactivacion} onOpenChange={(open) => !open && setDesactivacion(null)} title="Desactivar almacén" description={`“${desactivacion?.nombre ?? ''}” dejará de aparecer en nuevas operaciones. Para desactivarlo, primero debe quedar sin existencias.`} confirmLabel="Desactivar" loading={desactivar.isPending} onConfirm={() => desactivacion && desactivar.mutate(desactivacion.id)} />
  </>;
}

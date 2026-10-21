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
import { money } from '../lib/utils';
import { personalService } from '../services/personal.service';
import { useAuth } from '../store/auth';
import type { Cargo } from '../types/personal';

const esquema=z.object({nombre:z.string().trim().min(2,'Indica el nombre del cargo'),descripcion:z.string(),salarioBaseReferencia:z.string().refine(v=>v!==''&&Number.isFinite(Number(v))&&Number(v)>=0,'Ingresa un monto válido'),activo:z.boolean()});
type Formulario=z.infer<typeof esquema>;const inicial:Formulario={nombre:'',descripcion:'',salarioBaseReferencia:'0',activo:true};
export function Cargos(){
  const admin=useAuth(s=>s.user?.role==='admin'),qc=useQueryClient(),consulta=useQuery({queryKey:['personal','cargos'],queryFn:()=>personalService.cargos()});
  const[modal,setModal]=useState(false),[edicion,setEdicion]=useState<Cargo|null>(null),[baja,setBaja]=useState<Cargo|null>(null);
  const{register,handleSubmit,reset,formState:{errors}}=useForm<z.input<typeof esquema>,unknown,Formulario>({resolver:zodResolver(esquema),defaultValues:inicial});
  const abrir=(c?:Cargo)=>{setEdicion(c??null);reset(c?{nombre:c.nombre,descripcion:c.descripcion??'',salarioBaseReferencia:c.salarioBaseReferencia,activo:c.activo}:inicial);setModal(true)};
  const guardar=useMutation({mutationFn:(v:Formulario)=>{const d={...v,salarioBaseReferencia:Number(v.salarioBaseReferencia).toFixed(2)};return edicion?personalService.actualizarCargo(edicion.id,d):personalService.crearCargo(d)},onSuccess:()=>{toast.success('Cargo guardado');setModal(false);void qc.invalidateQueries({queryKey:['personal','cargos']})},onError:(e:Error)=>toast.error(e.message)});
  const desactivar=useMutation({mutationFn:(id:string)=>personalService.desactivarCargo(id),onSuccess:()=>{toast.success('Cargo desactivado');setBaja(null);void qc.invalidateQueries({queryKey:['personal','cargos']})},onError:(e:Error)=>toast.error(e.message)});
  const columnas=useMemo<ColumnDef<Cargo>[]>(()=>[{header:'Cargo',cell:({row})=><div><p className="font-semibold">{row.original.nombre}</p><p className="max-w-lg truncate text-xs text-stone-500">{row.original.descripcion||'Sin descripción'}</p></div>},{header:'Salario de referencia',cell:({row})=>money(row.original.salarioBaseReferencia)},{header:'Estado',cell:({row})=><span className={`badge ${row.original.activo?'bg-emerald-50 text-emerald-700':'bg-stone-100 text-stone-500'}`}>{row.original.activo?'Activo':'Inactivo'}</span>},{id:'acciones',header:'',cell:({row})=>admin?<div className="flex justify-end gap-1"><button onClick={()=>abrir(row.original)} className="rounded-lg p-2 text-stone-500 hover:bg-stone-100" title="Editar"><Pencil size={16}/></button>{row.original.activo&&<button onClick={()=>setBaja(row.original)} className="rounded-lg p-2 text-red-500 hover:bg-red-50" title="Desactivar"><Trash2 size={16}/></button>}</div>:null}], [admin]);
  return <><PageHeader title="Cargos" description="Catálogo de puestos y salarios de referencia." action={admin?<Button onClick={()=>abrir()}><Plus size={17}/>Nuevo cargo</Button>:undefined}/><div className="card overflow-hidden"><DataTable data={consulta.data?.data??[]} columns={columnas} loading={consulta.isLoading} empty="No hay cargos registrados"/></div>
    <Modal open={modal} onOpenChange={setModal} title={edicion?'Editar cargo':'Nuevo cargo'}><form className="space-y-4" onSubmit={handleSubmit(v=>guardar.mutate(v))}><Field label="Nombre *" error={errors.nombre?.message}><Input {...register('nombre')}/></Field><Field label="Salario base de referencia (Bs.)" error={errors.salarioBaseReferencia?.message}><Input type="number" min="0" step="0.01" {...register('salarioBaseReferencia')}/></Field><Field label="Descripción"><Textarea {...register('descripcion')}/></Field><label className="flex items-center gap-2 text-sm"><input type="checkbox" {...register('activo')}/> Cargo activo</label><div className="flex justify-end gap-3"><Button type="button" variant="secondary" onClick={()=>setModal(false)}>Cancelar</Button><Button type="submit" loading={guardar.isPending}>Guardar</Button></div></form></Modal>
    <ConfirmDialog open={Boolean(baja)} onOpenChange={v=>!v&&setBaja(null)} title="Desactivar cargo" description={`El cargo ${baja?.nombre??''} dejará de estar disponible para nuevas fichas.`} confirmLabel="Desactivar" loading={desactivar.isPending} onConfirm={()=>baja&&desactivar.mutate(baja.id)}/>
  </>;
}

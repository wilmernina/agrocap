import { zodResolver } from '@hookform/resolvers/zod';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { DataTable } from '../components/DataTable';
import { Pagination } from '../components/Pagination';
import { PageHeader } from '../components/PageHeader';
import { SearchBox } from '../components/SearchBox';
import { Button, Field, Input, Modal, Select, Textarea } from '../components/ui';
import { useDebounce } from '../hooks/useDebounce';
import { proveedoresService } from '../services/terceros.service';
import { useAuth } from '../store/auth';
import type { ProveedorFase1, ProveedorInput } from '../types/fase1';

const schema=z.object({nombre:z.string().trim().min(2,'Ingresa el nombre'),nit:z.string().max(40),telefono:z.string().max(30),email:z.union([z.email('Correo inválido'),z.literal('')]),direccion:z.string().max(1000),contacto:z.string().max(140),activo:z.boolean()});
type Formulario=z.infer<typeof schema>;const inicial:Formulario={nombre:'',nit:'',telefono:'',email:'',direccion:'',contacto:'',activo:true};

export function Suppliers(){
  const rol=useAuth(s=>s.user?.role);const puedeEditar=rol==='admin'||rol==='almacenero';const[pagina,setPagina]=useState(1);const[busqueda,setBusqueda]=useState('');const debounced=useDebounce(busqueda);const[estado,setEstado]=useState('true');const[modal,setModal]=useState(false);const[edicion,setEdicion]=useState<ProveedorFase1|null>(null);const[eliminar,setEliminar]=useState<ProveedorFase1|null>(null);const qc=useQueryClient();
  const consulta=useQuery({queryKey:['proveedores',{pagina,debounced,estado}],queryFn:()=>proveedoresService.listar({pagina,limite:10,busqueda:debounced,activo:estado===''?undefined:estado==='true'}),placeholderData:keepPreviousData});
  const{register,handleSubmit,reset,setError,formState:{errors}}=useForm<Formulario>({resolver:zodResolver(schema),defaultValues:inicial});
  const abrir=(item?:ProveedorFase1)=>{setEdicion(item??null);reset(item?{nombre:item.nombre,nit:item.nit??'',telefono:item.telefono??'',email:item.email??'',direccion:item.direccion??'',contacto:item.contacto??'',activo:item.activo}:inicial);setModal(true)};
  const guardar=useMutation({mutationFn:(datos:Formulario)=>{const payload:ProveedorInput={...datos,nit:datos.nit||null,telefono:datos.telefono||null,email:datos.email||null,direccion:datos.direccion||null,contacto:datos.contacto||null};return edicion?proveedoresService.actualizar(edicion.id,payload):proveedoresService.crear(payload)},onSuccess:()=>{toast.success(edicion?'Proveedor actualizado':'Proveedor creado');setModal(false);void qc.invalidateQueries({queryKey:['proveedores']})},onError:(error:Error)=>setError('root',{message:error.message})});
  const desactivar=useMutation({mutationFn:(id:string)=>proveedoresService.desactivar(id),onSuccess:()=>{toast.success('Proveedor desactivado');setEliminar(null);void qc.invalidateQueries({queryKey:['proveedores']})},onError:(error:Error)=>toast.error(error.message)});
  const columns=useMemo<ColumnDef<ProveedorFase1>[]>(()=>[
    {header:'Proveedor',cell:({row})=><div><p className="font-semibold text-stone-900">{row.original.nombre}</p><p className="text-xs text-stone-400">{row.original.nit?`NIT ${row.original.nit}`:'Sin NIT'}</p></div>},{header:'Contacto',cell:({row})=><div><p>{row.original.contacto||'—'}</p><p className="text-xs text-stone-400">{row.original.telefono||'Sin teléfono'}</p></div>},{header:'Correo',cell:({row})=>row.original.email||'—'},{header:'Estado',cell:({row})=><span className={`badge ${row.original.activo?'bg-emerald-50 text-emerald-700':'bg-stone-100 text-stone-500'}`}>{row.original.activo?'Activo':'Inactivo'}</span>},{header:'',cell:({row})=>puedeEditar&&<div className="flex justify-end gap-1"><button className="rounded-lg p-2 text-stone-500 hover:bg-stone-100" onClick={()=>abrir(row.original)}><Pencil size={16}/></button>{rol==='admin'&&row.original.activo&&<button className="rounded-lg p-2 text-red-500 hover:bg-red-50" onClick={()=>setEliminar(row.original)}><Trash2 size={16}/></button>}</div>},
  ],[puedeEditar,rol]);
  return <><PageHeader title="Proveedores" description="Directorio comercial para compras e ingresos de productos." action={puedeEditar?<Button onClick={()=>abrir()}><Plus size={17}/>Nuevo proveedor</Button>:undefined}/><div className="card overflow-hidden"><div className="flex flex-col gap-3 border-b p-4 sm:flex-row"><SearchBox value={busqueda} onChange={value=>{setBusqueda(value);setPagina(1)}} placeholder="Buscar por nombre, NIT o contacto"/><Select className="w-auto min-w-32" value={estado} onChange={e=>{setEstado(e.target.value);setPagina(1)}}><option value="true">Activos</option><option value="false">Inactivos</option><option value="">Todos</option></Select></div><DataTable data={consulta.data?.data??[]} columns={columns} loading={consulta.isLoading} empty="No se encontraron proveedores"/><Pagination meta={consulta.data?.meta} onPageChange={setPagina}/></div>
  <Modal open={modal} onOpenChange={setModal} title={edicion?'Editar proveedor':'Nuevo proveedor'} size="lg"><form onSubmit={handleSubmit(v=>guardar.mutate(v))} className="grid gap-4 sm:grid-cols-2"><Field label="Nombre o razón social *" error={errors.nombre?.message}><Input {...register('nombre')}/></Field><Field label="NIT"><Input {...register('nit')}/></Field><Field label="Persona de contacto"><Input {...register('contacto')}/></Field><Field label="Teléfono"><Input {...register('telefono')}/></Field><Field label="Correo" error={errors.email?.message}><Input type="email" {...register('email')}/></Field><div className="sm:col-span-2"><Field label="Dirección"><Textarea {...register('direccion')}/></Field></div><label className="flex items-center gap-2 text-sm text-stone-700"><input type="checkbox" {...register('activo')}/> Proveedor activo</label>{errors.root&&<p className="rounded-xl bg-red-50 p-3 text-sm text-red-700 sm:col-span-2">{errors.root.message}</p>}<div className="flex justify-end gap-3 sm:col-span-2"><Button type="button" variant="secondary" onClick={()=>setModal(false)}>Cancelar</Button><Button type="submit" loading={guardar.isPending}>Guardar proveedor</Button></div></form></Modal>
  <ConfirmDialog open={!!eliminar} onOpenChange={open=>!open&&setEliminar(null)} title="Desactivar proveedor" description={`“${eliminar?.nombre??''}” no podrá usarse en nuevas compras. Su historial se conservará.`} confirmLabel="Desactivar" loading={desactivar.isPending} onConfirm={()=>eliminar&&desactivar.mutate(eliminar.id)}/></>;
}

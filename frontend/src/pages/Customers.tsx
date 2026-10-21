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
import { money } from '../lib/utils';
import { clientesService } from '../services/terceros.service';
import { useAuth } from '../store/auth';
import type { ClienteFase1, ClienteInput } from '../types/fase1';

const schema=z.object({nombre:z.string().trim().min(2,'Ingresa el nombre'),nitCi:z.string().max(40),telefono:z.string().max(30),email:z.union([z.email('Correo inválido'),z.literal('')]),direccion:z.string().max(1000),tipo:z.enum(['externo','socio','interno']),limiteCredito:z.number().min(0),activo:z.boolean()});
type Formulario=z.infer<typeof schema>;
const inicial:Formulario={nombre:'',nitCi:'',telefono:'',email:'',direccion:'',tipo:'externo',limiteCredito:0,activo:true};

export function Customers(){
  const rol=useAuth(s=>s.user?.role);const puedeEditar=rol==='admin'||rol==='vendedor';
  const[pagina,setPagina]=useState(1);const[busqueda,setBusqueda]=useState('');const debounced=useDebounce(busqueda);const[estado,setEstado]=useState('true');
  const[modal,setModal]=useState(false);const[edicion,setEdicion]=useState<ClienteFase1|null>(null);const[eliminar,setEliminar]=useState<ClienteFase1|null>(null);const qc=useQueryClient();
  const consulta=useQuery({queryKey:['clientes',{pagina,debounced,estado}],queryFn:()=>clientesService.listar({pagina,limite:10,busqueda:debounced,activo:estado===''?undefined:estado==='true'}),placeholderData:keepPreviousData});
  const{register,handleSubmit,reset,setError,formState:{errors}}=useForm<Formulario>({resolver:zodResolver(schema),defaultValues:inicial});
  const abrir=(cliente?:ClienteFase1)=>{setEdicion(cliente??null);reset(cliente?{nombre:cliente.nombre,nitCi:cliente.nitCi??'',telefono:cliente.telefono??'',email:cliente.email??'',direccion:cliente.direccion??'',tipo:cliente.tipo,limiteCredito:Number(cliente.limiteCredito),activo:cliente.activo}:inicial);setModal(true)};
  const guardar=useMutation({mutationFn:(datos:Formulario)=>{const payload:ClienteInput={...datos,nitCi:datos.nitCi||null,telefono:datos.telefono||null,email:datos.email||null,direccion:datos.direccion||null};return edicion?clientesService.actualizar(edicion.id,payload):clientesService.crear(payload)},onSuccess:()=>{toast.success(edicion?'Cliente actualizado':'Cliente creado');setModal(false);void qc.invalidateQueries({queryKey:['clientes']})},onError:(error:Error)=>setError('root',{message:error.message})});
  const desactivar=useMutation({mutationFn:(id:string)=>clientesService.desactivar(id),onSuccess:()=>{toast.success('Cliente desactivado');setEliminar(null);void qc.invalidateQueries({queryKey:['clientes']})},onError:(error:Error)=>toast.error(error.message)});
  const columns=useMemo<ColumnDef<ClienteFase1>[]>(()=>[
    {header:'Cliente',cell:({row})=><div><p className="font-semibold text-stone-900">{row.original.nombre}</p><p className="text-xs text-stone-400">{row.original.nitCi||'Sin NIT/CI'}</p></div>},
    {header:'Tipo',cell:({row})=><span className="capitalize">{row.original.tipo}</span>},{header:'Contacto',cell:({row})=><div><p>{row.original.telefono||'—'}</p><p className="text-xs text-stone-400">{row.original.email||'Sin correo'}</p></div>},
    {header:'Crédito',cell:({row})=><span className="font-medium">{money(row.original.limiteCredito)}</span>},{header:'Estado',cell:({row})=><span className={`badge ${row.original.activo?'bg-emerald-50 text-emerald-700':'bg-stone-100 text-stone-500'}`}>{row.original.activo?'Activo':'Inactivo'}</span>},
    {id:'acciones',header:'',cell:({row})=>puedeEditar ? (<div className="flex justify-end gap-1"><button className="rounded-lg p-2 text-stone-500 hover:bg-stone-100" onClick={()=>abrir(row.original)}><Pencil size={16}/></button>{rol==='admin'&&row.original.activo&&<button className="rounded-lg p-2 text-red-500 hover:bg-red-50" onClick={()=>setEliminar(row.original)}><Trash2 size={16}/></button>}</div>) : null},
  ],[puedeEditar,rol]);
  return <><PageHeader title="Clientes" description="Personas, socios y organizaciones vinculadas a tus ventas." action={puedeEditar?<Button onClick={()=>abrir()}><Plus size={17}/>Nuevo cliente</Button>:undefined}/><div className="card overflow-hidden"><div className="flex flex-col gap-3 border-b p-4 sm:flex-row"><SearchBox value={busqueda} onChange={value=>{setBusqueda(value);setPagina(1)}} placeholder="Buscar por nombre, NIT/CI o teléfono"/><Select className="w-auto min-w-32" value={estado} onChange={e=>{setEstado(e.target.value);setPagina(1)}}><option value="true">Activos</option><option value="false">Inactivos</option><option value="">Todos</option></Select></div><DataTable data={consulta.data?.data??[]} columns={columns} loading={consulta.isLoading} empty="No se encontraron clientes"/><Pagination meta={consulta.data?.meta} onPageChange={setPagina}/></div>
  <Modal open={modal} onOpenChange={setModal} title={edicion?'Editar cliente':'Nuevo cliente'} size="lg"><form onSubmit={handleSubmit(v=>guardar.mutate(v))} className="grid gap-4 sm:grid-cols-2"><Field label="Nombre o razón social *" error={errors.nombre?.message}><Input {...register('nombre')}/></Field><Field label="NIT / CI"><Input {...register('nitCi')}/></Field><Field label="Tipo"><Select {...register('tipo')}><option value="externo">Externo</option><option value="socio">Socio</option><option value="interno">Interno</option></Select></Field><Field label="Límite de crédito (Bs.)" error={errors.limiteCredito?.message}><Input type="number" step="0.01" {...register('limiteCredito',{valueAsNumber:true})}/></Field><Field label="Teléfono"><Input {...register('telefono')}/></Field><Field label="Correo" error={errors.email?.message}><Input type="email" {...register('email')}/></Field><div className="sm:col-span-2"><Field label="Dirección"><Textarea {...register('direccion')}/></Field></div><label className="flex items-center gap-2 text-sm text-stone-700"><input type="checkbox" {...register('activo')}/> Cliente activo</label>{errors.root&&<p className="rounded-xl bg-red-50 p-3 text-sm text-red-700 sm:col-span-2">{errors.root.message}</p>}<div className="flex justify-end gap-3 sm:col-span-2"><Button type="button" variant="secondary" onClick={()=>setModal(false)}>Cancelar</Button><Button type="submit" loading={guardar.isPending}>Guardar cliente</Button></div></form></Modal>
  <ConfirmDialog open={!!eliminar} onOpenChange={open=>!open&&setEliminar(null)} title="Desactivar cliente" description={`“${eliminar?.nombre??''}” no podrá seleccionarse en nuevas ventas. Su historial se conservará.`} confirmLabel="Desactivar" loading={desactivar.isPending} onConfirm={()=>eliminar&&desactivar.mutate(eliminar.id)}/></>;
}

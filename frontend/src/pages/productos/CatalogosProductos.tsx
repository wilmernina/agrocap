import { zodResolver } from '@hookform/resolvers/zod';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { DataTable } from '../../components/DataTable';
import { Pagination } from '../../components/Pagination';
import { SearchBox } from '../../components/SearchBox';
import { Button, Field, Input, Modal, Textarea } from '../../components/ui';
import { useDebounce } from '../../hooks/useDebounce';
import { catalogosService } from '../../services/catalogos.service';
import { useAuth } from '../../store/auth';
import type { CategoriaProducto, UnidadMedida } from '../../types/fase1';

type TipoCatalogo = 'categoria'|'unidad';
type Formulario = { nombre: string; detalle: string; activo: boolean };

export function CategoriasPanel(){return <CatalogoPanel tipo="categoria"/>}
export function UnidadesPanel(){return <CatalogoPanel tipo="unidad"/>}

function CatalogoPanel({tipo}:{tipo:TipoCatalogo}) {
  const esCategoria=tipo==='categoria'; const titulo=esCategoria?'categoría':'unidad'; const plural=esCategoria?'categorías':'unidades';
  const rol=useAuth(s=>s.user?.role); const puedeEditar=rol==='admin'||rol==='almacenero';
  const [pagina,setPagina]=useState(1); const [busqueda,setBusqueda]=useState(''); const debounced=useDebounce(busqueda);
  const [modal,setModal]=useState(false); const [edicion,setEdicion]=useState<CategoriaProducto|UnidadMedida|null>(null); const [eliminar,setEliminar]=useState<CategoriaProducto|UnidadMedida|null>(null);
  const qc=useQueryClient();
  const consulta=useQuery({queryKey:[plural,{pagina,debounced}],queryFn:async()=>{
    if(esCategoria){const respuesta=await catalogosService.categorias.listar({pagina,limite:10,busqueda:debounced});return {data:respuesta.data as Array<CategoriaProducto|UnidadMedida>,meta:respuesta.meta};}
    const respuesta=await catalogosService.unidades.listar({pagina,limite:10,busqueda:debounced});return {data:respuesta.data as Array<CategoriaProducto|UnidadMedida>,meta:respuesta.meta};
  },placeholderData:keepPreviousData});
  const schema=z.object({nombre:z.string().trim().min(2,'Ingresa al menos 2 caracteres'),detalle:esCategoria?z.string().max(1000):z.string().trim().min(1,'La abreviatura es obligatoria').max(12),activo:z.boolean()});
  const {register,handleSubmit,reset,setError,formState:{errors}}=useForm<Formulario>({resolver:zodResolver(schema),defaultValues:{nombre:'',detalle:'',activo:true}});
  const abrir=(item?:CategoriaProducto|UnidadMedida)=>{setEdicion(item??null);reset(item?{nombre:item.nombre,detalle:esCategoria?(item as CategoriaProducto).descripcion??'':(item as UnidadMedida).abreviatura,activo:item.activo}:{nombre:'',detalle:'',activo:true});setModal(true)};
  const guardar=useMutation<unknown,Error,Formulario>({mutationFn:async(datos)=>{if(esCategoria){const payload={nombre:datos.nombre,descripcion:datos.detalle||null,activo:datos.activo};return edicion?catalogosService.categorias.actualizar(edicion.id,payload):catalogosService.categorias.crear(payload)}const payload={nombre:datos.nombre,abreviatura:datos.detalle,activo:datos.activo};return edicion?catalogosService.unidades.actualizar(edicion.id,payload):catalogosService.unidades.crear(payload)},onSuccess:()=>{toast.success(`${esCategoria?'Categoría':'Unidad'} ${edicion?'actualizada':'creada'}`);setModal(false);void qc.invalidateQueries({queryKey:[plural]});void qc.invalidateQueries({queryKey:[esCategoria?'categorias-select':'unidades-select']})},onError:(error)=>setError('root',{message:error.message})});
  const desactivar=useMutation<unknown,Error,string>({mutationFn:async(id)=>esCategoria?catalogosService.categorias.desactivar(id):catalogosService.unidades.desactivar(id),onSuccess:()=>{toast.success(`${esCategoria?'Categoría':'Unidad'} desactivada`);setEliminar(null);void qc.invalidateQueries({queryKey:[plural]});void qc.invalidateQueries({queryKey:[esCategoria?'categorias-select':'unidades-select']})},onError:(error)=>toast.error(error.message)});
  const datos=(consulta.data?.data??[]) as Array<CategoriaProducto|UnidadMedida>;
  const columns=useMemo<ColumnDef<CategoriaProducto|UnidadMedida>[]>(()=>[
    {header:'Nombre',cell:({row})=><div><p className="font-semibold text-stone-900">{row.original.nombre}</p><p className="max-w-xl truncate text-xs text-stone-400">{esCategoria?(row.original as CategoriaProducto).descripcion||'Sin descripción':`Abreviatura: ${(row.original as UnidadMedida).abreviatura}`}</p></div>},
    {header:'Estado',cell:({row})=><span className={`badge ${row.original.activo?'bg-emerald-50 text-emerald-700':'bg-stone-100 text-stone-500'}`}>{row.original.activo?'Activa':'Inactiva'}</span>},
    {id:'acciones',header:'',cell:({row})=>puedeEditar ? (<div className="flex justify-end gap-1"><button className="rounded-lg p-2 text-stone-500 hover:bg-stone-100" onClick={()=>abrir(row.original)}><Pencil size={16}/></button>{rol==='admin'&&row.original.activo&&<button className="rounded-lg p-2 text-red-500 hover:bg-red-50" onClick={()=>setEliminar(row.original)}><Trash2 size={16}/></button>}</div>) : null},
  ],[esCategoria,puedeEditar,rol]);
  return <>
    <div className="card overflow-hidden"><div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:justify-between"><SearchBox value={busqueda} onChange={value=>{setBusqueda(value);setPagina(1)}} placeholder={`Buscar ${plural}`}/>{puedeEditar&&<Button onClick={()=>abrir()}><Plus size={17}/>Nueva {titulo}</Button>}</div><DataTable data={datos} columns={columns} loading={consulta.isLoading} empty={`No hay ${plural}`}/><Pagination meta={consulta.data?.meta} onPageChange={setPagina}/></div>
    <Modal open={modal} onOpenChange={setModal} title={`${edicion?'Editar':'Nueva'} ${titulo}`} size="sm"><form onSubmit={handleSubmit(datos=>guardar.mutate(datos))} className="space-y-4"><Field label="Nombre *" error={errors.nombre?.message}><Input {...register('nombre')}/></Field>{esCategoria?<Field label="Descripción" error={errors.detalle?.message}><Textarea {...register('detalle')}/></Field>:<Field label="Abreviatura *" error={errors.detalle?.message}><Input placeholder="kg, lt, saco…" {...register('detalle')}/></Field>}<label className="flex items-center gap-2 text-sm text-stone-700"><input type="checkbox" {...register('activo')}/> Registro activo</label>{errors.root&&<p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{errors.root.message}</p>}<div className="flex justify-end gap-3"><Button type="button" variant="secondary" onClick={()=>setModal(false)}>Cancelar</Button><Button type="submit" loading={guardar.isPending}>Guardar</Button></div></form></Modal>
    <ConfirmDialog open={!!eliminar} onOpenChange={open=>!open&&setEliminar(null)} title={`Desactivar ${titulo}`} description={`“${eliminar?.nombre??''}” dejará de estar disponible para nuevos productos.`} confirmLabel="Desactivar" loading={desactivar.isPending} onConfirm={()=>eliminar&&desactivar.mutate(eliminar.id)}/>
  </>;
}

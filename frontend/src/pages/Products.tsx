import { zodResolver } from '@hookform/resolvers/zod';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { AlertTriangle, Barcode, Pencil, Plus, Tag, Trash2, Weight, Ruler } from 'lucide-react';
import { type FormEvent, useMemo, useState } from 'react';
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
import { catalogosService } from '../services/catalogos.service';
import { productosService } from '../services/productos.service';
import { inventarioService } from '../services/inventario.service';
import { useAuth } from '../store/auth';
import type { ProductoFase1, ProductoInput, TipoProducto } from '../types/fase1';
import { CategoriasPanel, UnidadesPanel } from './productos/CatalogosProductos';

const numeroOpcional = z.number().min(0).nullable();
const productoSchema = z.object({
  sku: z.string().trim().min(1, 'El SKU es obligatorio').max(60), codigoBarras: z.string().max(80),
  nombre: z.string().trim().min(2, 'Ingresa el nombre').max(160), descripcion: z.string().max(2000),
  categoriaId: z.uuid('Selecciona una categoría'), unidadMedidaId: z.uuid('Selecciona una unidad'),
  tipo: z.enum(['semilla','fertilizante','herbicida','fungicida','insecticida','herramienta','maquinaria','otro']),
  precioCosto: z.number().min(0), precioVenta: z.number().min(0), stockMinimo: z.number().min(0),
  stockMaximo: numeroOpcional, requiereReceta: z.boolean(), activo: z.boolean(),
}).refine((datos) => datos.stockMaximo === null || datos.stockMaximo >= datos.stockMinimo, { path: ['stockMaximo'], message: 'Debe ser mayor o igual al mínimo' });
type ProductoForm = z.infer<typeof productoSchema>;

const tipos: Array<{ value: TipoProducto; label: string }> = [
  { value: 'semilla', label: 'Semilla' }, { value: 'fertilizante', label: 'Fertilizante' },
  { value: 'herbicida', label: 'Herbicida' }, { value: 'fungicida', label: 'Fungicida' },
  { value: 'insecticida', label: 'Insecticida' }, { value: 'herramienta', label: 'Herramienta' },
  { value: 'maquinaria', label: 'Maquinaria' }, { value: 'otro', label: 'Otro' },
];
const valoresIniciales: ProductoForm = { sku:'',codigoBarras:'',nombre:'',descripcion:'',categoriaId:'',unidadMedidaId:'',tipo:'otro',precioCosto:0,precioVenta:0,stockMinimo:0,stockMaximo:null,requiereReceta:false,activo:true };

export function Products() {
  const [tab, setTab] = useState<'productos'|'categorias'|'unidades'|'presentaciones'>('productos');
  return <div>
    <PageHeader title="Productos" description="Administra el catálogo, precios y parámetros de inventario." />
    <div className="mb-5 flex w-fit rounded-xl border bg-white p-1 shadow-sm">
      {([['productos','Productos',Barcode],['categorias','Categorías',Tag],['unidades','Unidades',Weight],['presentaciones','Presentaciones y conversiones',Ruler]] as const).map(([value,label,Icon])=><button key={value} onClick={()=>setTab(value)} className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold ${tab===value?'bg-brand-700 text-white':'text-stone-500 hover:bg-stone-50'}`}><Icon size={16}/>{label}</button>)}
    </div>
    {tab==='productos'?<ProductosPanel/>:tab==='categorias'?<CategoriasPanel/>:tab==='unidades'?<UnidadesPanel/>:<PresentacionesPanel/>}
  </div>;
}

function ProductosPanel() {
  const rol = useAuth((state) => state.user?.role);
  const puedeEditar = rol === 'admin' || rol === 'almacenero';
  const [pagina,setPagina]=useState(1); const [busqueda,setBusqueda]=useState(''); const busquedaDebounce=useDebounce(busqueda);
  const [categoria,setCategoria]=useState(''); const [tipo,setTipo]=useState<TipoProducto|''>(''); const [estado,setEstado]=useState('true'); const [stockBajo,setStockBajo]=useState(false);
  const [modal,setModal]=useState(false); const [edicion,setEdicion]=useState<ProductoFase1|null>(null); const [eliminar,setEliminar]=useState<ProductoFase1|null>(null);
  const qc=useQueryClient();
  const categorias=useQuery({queryKey:['categorias-select'],queryFn:()=>catalogosService.categorias.listar({limite:100,activo:true}).then(r=>r.data)});
  const unidades=useQuery({queryKey:['unidades-select'],queryFn:()=>catalogosService.unidades.listar({limite:100,activo:true}).then(r=>r.data)});
  const consulta=useQuery({queryKey:['productos',{pagina,busquedaDebounce,categoria,tipo,estado,stockBajo}],queryFn:()=>productosService.listar({pagina,limite:10,busqueda:busquedaDebounce,categoria,tipo,activo:estado===''?undefined:estado==='true',stock_bajo:stockBajo||undefined}),placeholderData:keepPreviousData});
  const {register,handleSubmit,reset,setError,formState:{errors}}=useForm<ProductoForm>({resolver:zodResolver(productoSchema),defaultValues:valoresIniciales});

  const abrir=(producto?:ProductoFase1)=>{setEdicion(producto??null);reset(producto?{sku:producto.sku,codigoBarras:producto.codigoBarras??'',nombre:producto.nombre,descripcion:producto.descripcion??'',categoriaId:producto.categoriaId,unidadMedidaId:producto.unidadMedidaId,tipo:producto.tipo,precioCosto:Number(producto.precioCosto),precioVenta:Number(producto.precioVenta),stockMinimo:Number(producto.stockMinimo),stockMaximo:producto.stockMaximo===null?null:Number(producto.stockMaximo),requiereReceta:producto.requiereReceta,activo:producto.activo}:valoresIniciales);setModal(true)};
  const guardar=useMutation({mutationFn:(datos:ProductoForm)=>{const payload:ProductoInput={...datos,codigoBarras:datos.codigoBarras||null,descripcion:datos.descripcion||null};return edicion?productosService.actualizar(edicion.id,payload):productosService.crear(payload)},onSuccess:()=>{toast.success(edicion?'Producto actualizado':'Producto creado');setModal(false);void qc.invalidateQueries({queryKey:['productos']});void qc.invalidateQueries({queryKey:['productos-inventario']})},onError:(error:Error)=>setError('root',{message:error.message})});
  const desactivar=useMutation({mutationFn:(id:string)=>productosService.desactivar(id),onSuccess:()=>{toast.success('Producto desactivado');setEliminar(null);void qc.invalidateQueries({queryKey:['productos']})},onError:(error:Error)=>toast.error(error.message)});

  const columns=useMemo<ColumnDef<ProductoFase1>[]>(()=>[
    {header:'Producto',cell:({row})=><div className="max-w-xs"><p className="font-semibold text-stone-900">{row.original.nombre}</p><p className="mt-0.5 text-xs text-stone-400">{row.original.sku}{row.original.codigoBarras?` · ${row.original.codigoBarras}`:''}</p></div>},
    {header:'Categoría',cell:({row})=><div><p>{row.original.categoria}</p><p className="text-xs capitalize text-stone-400">{row.original.tipo}</p></div>},
    {header:'Precio',cell:({row})=><div><p className="font-semibold">{money(row.original.precioVenta)}</p><p className="text-xs text-stone-400">Costo {money(row.original.precioCosto)}</p></div>},
    {header:'Stock',cell:({row})=>{const bajo=Number(row.original.stockActual)<=Number(row.original.stockMinimo);return <div className={bajo?'text-red-700':''}><p className="font-semibold">{Number(row.original.stockActual)} {row.original.abreviatura}</p><p className="text-xs text-stone-400">Mín. {Number(row.original.stockMinimo)}</p></div>}},
    {header:'Estado',cell:({row})=><span className={`badge ${row.original.activo?'bg-emerald-50 text-emerald-700':'bg-stone-100 text-stone-500'}`}>{row.original.activo?'Activo':'Inactivo'}</span>},
    {id:'acciones',header:'',cell:({row})=>puedeEditar ? (<div className="flex justify-end gap-1"><button className="rounded-lg p-2 text-stone-500 hover:bg-stone-100" onClick={()=>abrir(row.original)} title="Editar"><Pencil size={16}/></button>{rol==='admin'&&row.original.activo&&<button className="rounded-lg p-2 text-red-500 hover:bg-red-50" onClick={()=>setEliminar(row.original)} title="Desactivar"><Trash2 size={16}/></button>}</div>) : null},
  ],[puedeEditar,rol]);

  return <>
    <div className="card overflow-hidden">
      <div className="flex flex-col gap-3 border-b p-4 xl:flex-row xl:items-center">
        <SearchBox value={busqueda} onChange={(value)=>{setBusqueda(value);setPagina(1)}} placeholder="Buscar por nombre, SKU o código"/>
        <div className="flex flex-1 flex-wrap gap-2 xl:justify-end"><Select className="w-auto min-w-40" value={categoria} onChange={e=>{setCategoria(e.target.value);setPagina(1)}}><option value="">Todas las categorías</option>{categorias.data?.map(x=><option key={x.id} value={x.id}>{x.nombre}</option>)}</Select><Select className="w-auto min-w-36" value={tipo} onChange={e=>{setTipo(e.target.value as TipoProducto|'');setPagina(1)}}><option value="">Todos los tipos</option>{tipos.map(x=><option value={x.value} key={x.value}>{x.label}</option>)}</Select><Select className="w-auto" value={estado} onChange={e=>{setEstado(e.target.value);setPagina(1)}}><option value="true">Activos</option><option value="false">Inactivos</option><option value="">Todos</option></Select><label className="flex h-10 items-center gap-2 rounded-xl border bg-white px-3 text-sm text-stone-600"><input type="checkbox" checked={stockBajo} onChange={e=>{setStockBajo(e.target.checked);setPagina(1)}}/> Stock bajo</label>{puedeEditar&&<Button onClick={()=>abrir()}><Plus size={17}/>Nuevo producto</Button>}</div>
      </div>
      {consulta.isError&&<p className="m-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{consulta.error.message}</p>}
      <DataTable data={consulta.data?.data??[]} columns={columns} loading={consulta.isLoading} empty="No se encontraron productos"/>
      <Pagination meta={consulta.data?.meta} onPageChange={setPagina}/>
    </div>

    <Modal open={modal} onOpenChange={setModal} title={edicion?'Editar producto':'Nuevo producto'} description="Los movimientos de inventario se registran por separado." size="lg"><form onSubmit={handleSubmit(datos=>guardar.mutate(datos))} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Field label="SKU *" error={errors.sku?.message}><Input {...register('sku')}/></Field><Field label="Código de barras" error={errors.codigoBarras?.message}><Input {...register('codigoBarras')}/></Field><Field label="Nombre *" error={errors.nombre?.message}><Input {...register('nombre')}/></Field>
      <Field label="Categoría *" error={errors.categoriaId?.message}><Select {...register('categoriaId')}><option value="">Selecciona…</option>{categorias.data?.map(x=><option key={x.id} value={x.id}>{x.nombre}</option>)}</Select></Field><Field label="Unidad *" error={errors.unidadMedidaId?.message}><Select {...register('unidadMedidaId')}><option value="">Selecciona…</option>{unidades.data?.map(x=><option key={x.id} value={x.id}>{x.nombre} ({x.abreviatura})</option>)}</Select></Field><Field label="Tipo *"><Select {...register('tipo')}>{tipos.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}</Select></Field>
      <Field label="Costo (Bs.)" error={errors.precioCosto?.message}><Input type="number" step="0.01" {...register('precioCosto',{valueAsNumber:true})}/></Field><Field label="Venta (Bs.)" error={errors.precioVenta?.message}><Input type="number" step="0.01" {...register('precioVenta',{valueAsNumber:true})}/></Field><div className="hidden lg:block"/>
      <Field label="Stock mínimo" error={errors.stockMinimo?.message}><Input type="number" step="0.001" {...register('stockMinimo',{valueAsNumber:true})}/></Field><Field label="Stock máximo" error={errors.stockMaximo?.message}><Input type="number" step="0.001" {...register('stockMaximo',{setValueAs:(valor)=>valor===''?null:Number(valor)})}/></Field>
      <div className="flex flex-col justify-end gap-2 pb-1"><label className="flex items-center gap-2 text-sm text-stone-700"><input type="checkbox" {...register('requiereReceta')}/> Requiere receta</label><label className="flex items-center gap-2 text-sm text-stone-700"><input type="checkbox" {...register('activo')}/> Producto activo</label></div>
      <div className="sm:col-span-2 lg:col-span-3"><Field label="Descripción" error={errors.descripcion?.message}><Textarea {...register('descripcion')}/></Field></div>
      {errors.root&&<p className="rounded-xl bg-red-50 p-3 text-sm text-red-700 sm:col-span-2 lg:col-span-3">{errors.root.message}</p>}
      <div className="flex justify-end gap-3 sm:col-span-2 lg:col-span-3"><Button type="button" variant="secondary" onClick={()=>setModal(false)}>Cancelar</Button><Button type="submit" loading={guardar.isPending}>{edicion?'Guardar cambios':'Crear producto'}</Button></div>
    </form></Modal>
    <ConfirmDialog open={!!eliminar} onOpenChange={open=>!open&&setEliminar(null)} title="Desactivar producto" description={`“${eliminar?.nombre??''}” dejará de estar disponible para nuevas operaciones. Su historial se conservará.`} confirmLabel="Desactivar" loading={desactivar.isPending} onConfirm={()=>eliminar&&desactivar.mutate(eliminar.id)}/>
  </>;
}

function PresentacionesPanel(){
 const qc=useQueryClient();const productos=useQuery({queryKey:['productos-presentacion'],queryFn:()=>productosService.listar({pagina:1,limite:200,activo:true}).then(r=>r.data)});const unidades=useQuery({queryKey:['unidades-presentacion'],queryFn:()=>catalogosService.unidades.listar({pagina:1,limite:200,activo:true}).then(r=>r.data)});const presentaciones=useQuery({queryKey:['presentaciones-producto'],queryFn:()=>inventarioService.presentaciones().then(r=>r.data)});const conversiones=useQuery({queryKey:['conversiones-unidad'],queryFn:()=>inventarioService.conversiones().then(r=>r.data)});
 const guardar=useMutation({mutationFn:({path,data}:{path:'presentaciones'|'conversiones-unidad';data:unknown})=>path==='presentaciones'?inventarioService.crearPresentacion(data as {productoId:string;nombre:string;unidadId:string;factorAUnidadBase:number;codigoBarras?:string;precioVenta?:number}):inventarioService.crearConversion(data as {unidadOrigenId:string;unidadDestinoId:string;factor:number}),onSuccess:()=>{toast.success('Configuración de unidades guardada');void qc.invalidateQueries({queryKey:['presentaciones-producto']});void qc.invalidateQueries({queryKey:['conversiones-unidad']})},onError:(e:Error)=>toast.error(e.message)});
 const send=(path:'presentaciones'|'conversiones-unidad',build:(f:FormData)=>unknown)=>(e:FormEvent<HTMLFormElement>)=>{e.preventDefault();guardar.mutate({path,data:build(new FormData(e.currentTarget))});e.currentTarget.reset()};
 return <div className="space-y-4"><div className="grid gap-4 xl:grid-cols-2"><section className="card p-5"><h2 className="mb-4 font-display text-lg font-bold">Agregar presentación de producto</h2><p className="mb-4 text-sm text-stone-500">Define cuántas unidades base contiene cada envase o formato de venta.</p><form className="grid gap-3 sm:grid-cols-2" onSubmit={send('presentaciones',f=>({productoId:f.get('productoId'),nombre:f.get('nombre'),unidadId:f.get('unidadId'),factorAUnidadBase:Number(f.get('factor')),codigoBarras:f.get('codigoBarras')||undefined,precioVenta:f.get('precioVenta')?Number(f.get('precioVenta')):undefined}))}><Select name="productoId" required><option value="">Producto</option>{productos.data?.map(p=><option key={p.id} value={p.id}>{p.sku} · {p.nombre}</option>)}</Select><Input name="nombre" placeholder="Nombre (caja, bidón, bolsa)" required/><Select name="unidadId" required><option value="">Unidad de presentación</option>{unidades.data?.map(u=><option key={u.id} value={u.id}>{u.nombre} ({u.abreviatura})</option>)}</Select><Input name="factor" type="number" min="0.000001" step="0.000001" placeholder="Equivalencia en unidad base" required/><Input name="codigoBarras" placeholder="Código de barras opcional"/><Input name="precioVenta" type="number" min="0" step="0.01" placeholder="Precio propio opcional"/><div className="sm:col-span-2"><Button disabled={guardar.isPending}><Plus size={16}/>Guardar presentación</Button></div></form></section>
 <section className="card p-5"><h2 className="mb-4 font-display text-lg font-bold">Conversión entre unidades</h2><p className="mb-4 text-sm text-stone-500">Indica cuántas unidades destino equivalen a una unidad de origen.</p><form className="grid gap-3 sm:grid-cols-2" onSubmit={send('conversiones-unidad',f=>({unidadOrigenId:f.get('origen'),unidadDestinoId:f.get('destino'),factor:Number(f.get('factor'))}))}><Select name="origen" required><option value="">Unidad de origen</option>{unidades.data?.map(u=><option key={u.id} value={u.id}>{u.nombre} ({u.abreviatura})</option>)}</Select><Select name="destino" required><option value="">Unidad de destino</option>{unidades.data?.map(u=><option key={u.id} value={u.id}>{u.nombre} ({u.abreviatura})</option>)}</Select><Input name="factor" type="number" min="0.000001" step="0.000001" placeholder="Factor de conversión" required/><div className="sm:col-span-2"><Button disabled={guardar.isPending}><Plus size={16}/>Guardar conversión</Button></div></form></section></div>
 <div className="grid gap-4 xl:grid-cols-2"><ListBox title="Presentaciones activas" rows={presentaciones.data??[]} label={r=>`${r.producto} · ${r.nombre}`} detail={r=>`1 ${r.unidad} = ${r.factor_a_unidad_base} unidad(es) base · ${r.codigo_barras||'sin código'}${r.precio_venta?` · ${money(r.precio_venta)}`:''}`}/><ListBox title="Conversiones definidas" rows={conversiones.data??[]} label={r=>`${r.unidad_origen} → ${r.unidad_destino}`} detail={r=>`1 ${r.abreviatura_origen} = ${r.factor} ${r.abreviatura_destino}`}/></div></div>;
}
function ListBox({title,rows,label,detail}:{title:string;rows:Array<Record<string,any>>;label:(r:Record<string,any>)=>string;detail:(r:Record<string,any>)=>string}){return <section className="card p-5"><h3 className="mb-3 font-display font-bold">{title}</h3>{rows.map((r,i)=><div className="border-t py-2" key={String(r.id??i)}><b className="text-sm">{label(r)}</b><p className="text-xs text-stone-500">{detail(r)}</p></div>)}{!rows.length&&<p className="text-sm text-stone-400">Sin registros.</p>}</section>}

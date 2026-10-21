import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { CalendarDays, Pencil, Plus, Sparkles, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { DataTable } from '../components/DataTable';
import { PageHeader } from '../components/PageHeader';
import { Button, Field, Input, Modal, Select } from '../components/ui';
import { personalService } from '../services/personal.service';
import type { Feriado } from '../types/personal';
import { useAuth } from '../store/auth';

const tipos:Record<Feriado['tipo'],string>={nacional:'Nacional',departamental:'Departamental',regional:'Regional'};
const departamentos=['Beni','Chuquisaca','Cochabamba','La Paz','Oruro','Pando','Potosí','Santa Cruz','Tarija'];
type FormFeriado={fecha:string;nombre:string;tipo:Feriado['tipo'];departamento:string};
const vacio=():FormFeriado=>({fecha:'',nombre:'',tipo:'nacional',departamento:''});

export function Feriados(){
  const admin=useAuth(s=>s.user?.role==='admin'),qc=useQueryClient();
  const[gestion,setGestion]=useState(new Date().getFullYear()),[tipo,setTipo]=useState(''),[departamento,setDepartamento]=useState(''),[modal,setModal]=useState(false),[edicion,setEdicion]=useState<Feriado|null>(null),[baja,setBaja]=useState<Feriado|null>(null),[form,setForm]=useState<FormFeriado>(vacio());
  const consulta=useQuery({queryKey:['personal','feriados',gestion,tipo,departamento],queryFn:()=>personalService.feriados({gestion,tipo:tipo||undefined,departamento:departamento||undefined})});
  const invalidar=()=>void qc.invalidateQueries({queryKey:['personal','feriados']});
  const guardar=useMutation({mutationFn:({id,d}:{id:string|null;d:FormFeriado})=>id?personalService.actualizarFeriado(id,{...d,departamento:d.departamento||null}):personalService.crearFeriado({...d,departamento:d.departamento||null,activo:true}),onSuccess:()=>{toast.success('Feriado guardado');setModal(false);invalidar()},onError:(e:Error)=>toast.error(e.message)});
  const eliminar=useMutation({mutationFn:(id:string)=>personalService.desactivarFeriado(id),onSuccess:()=>{toast.success('Feriado desactivado');setBaja(null);invalidar()},onError:(e:Error)=>toast.error(e.message)});
  const precargar=useMutation({mutationFn:personalService.precargarFeriados,onSuccess:r=>{toast.success(`${r.data.creados} feriados agregados para ${gestion}`);invalidar()},onError:(e:Error)=>toast.error(e.message)});
  const abrir=(f?:Feriado)=>{setEdicion(f??null);setForm(f?{fecha:f.fecha.slice(0,10),nombre:f.nombre,tipo:f.tipo,departamento:f.departamento??''}:vacio());setModal(true)};
  const enviar=(e:React.FormEvent<HTMLFormElement>)=>{e.preventDefault();guardar.mutate({id:edicion?.id??null,d:form})};
  const columnas=useMemo<ColumnDef<Feriado>[]>(()=>[
    {header:'Fecha',cell:({row})=><span className="font-semibold">{new Intl.DateTimeFormat('es-BO',{dateStyle:'medium',timeZone:'UTC'}).format(new Date(`${row.original.fecha.slice(0,10)}T12:00:00Z`))}</span>},
    {header:'Feriado',accessorKey:'nombre'},
    {header:'Ámbito',cell:({row})=><span className="badge bg-emerald-50 text-emerald-700">{tipos[row.original.tipo]}</span>},
    {header:'Departamento',cell:({row})=>row.original.departamento??'Todo el país'},
    {header:'Estado',cell:({row})=><span className={`badge ${row.original.activo?'bg-emerald-50 text-emerald-700':'bg-stone-100 text-stone-500'}`}>{row.original.activo?'Activo':'Inactivo'}</span>},
    {id:'acciones',header:'',cell:({row})=>admin&&row.original.activo?<div className="flex justify-end gap-1"><button title="Editar" className="rounded-lg p-2 text-stone-500 hover:bg-stone-100" onClick={()=>abrir(row.original)}><Pencil size={16}/></button><button title="Desactivar" className="rounded-lg p-2 text-red-600 hover:bg-red-50" onClick={()=>setBaja(row.original)}><Trash2 size={16}/></button></div>:null},
  ],[admin]);
  return <><PageHeader title="Feriados" description="Administra los feriados laborales por gestión y departamento." action={admin?<div className="flex gap-2"><Button variant="secondary" loading={precargar.isPending} onClick={()=>precargar.mutate(gestion)}><Sparkles size={16}/>Precargar Bolivia {gestion}</Button><Button onClick={()=>abrir()}><Plus size={17}/>Nuevo feriado</Button></div>:undefined}/>
    <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">La precarga genera feriados nacionales y efemérides departamentales. Revisa los traslados o decretos excepcionales publicados para la gestión seleccionada.</div>
    <section className="card mb-5 flex flex-wrap items-end gap-3 p-4"><Field label="Gestión"><Input type="number" min={2000} max={2200} value={gestion} onChange={e=>setGestion(Number(e.target.value))} className="w-36"/></Field><Field label="Tipo"><Select value={tipo} onChange={e=>setTipo(e.target.value)} className="w-48"><option value="">Todos</option><option value="nacional">Nacional</option><option value="departamental">Departamental</option><option value="regional">Regional</option></Select></Field><Field label="Departamento"><Select value={departamento} onChange={e=>setDepartamento(e.target.value)} className="w-48"><option value="">Todos</option>{departamentos.map(d=><option key={d}>{d}</option>)}</Select></Field><span className="pb-2 text-sm text-stone-500"><CalendarDays className="mr-1 inline" size={16}/>{consulta.data?.data.length??0} fechas</span></section>
    <section className="card overflow-hidden"><DataTable data={consulta.data?.data??[]} columns={columnas} loading={consulta.isLoading} empty="No hay feriados para esta gestión"/></section>
    <Modal open={modal} onOpenChange={setModal} title={edicion?'Editar feriado':'Registrar feriado'} description="La fecha se usa en las consultas de asistencia y planilla." size="md"><form onSubmit={enviar} className="grid gap-4 sm:grid-cols-2"><Field label="Fecha *"><Input type="date" required value={form.fecha} onChange={e=>setForm({...form,fecha:e.target.value})}/></Field><Field label="Nombre *"><Input required maxLength={160} value={form.nombre} onChange={e=>setForm({...form,nombre:e.target.value})}/></Field><Field label="Tipo"><Select value={form.tipo} onChange={e=>setForm({...form,tipo:e.target.value as Feriado['tipo']})}><option value="nacional">Nacional</option><option value="departamental">Departamental</option><option value="regional">Regional</option></Select></Field>{form.tipo!=='nacional'&&<Field label="Departamento"><Select value={form.departamento} onChange={e=>setForm({...form,departamento:e.target.value})}><option value="">Selecciona</option>{departamentos.map(d=><option key={d}>{d}</option>)}</Select></Field>}<div className="flex justify-end gap-2 sm:col-span-2"><Button type="button" variant="secondary" onClick={()=>setModal(false)}>Cancelar</Button><Button type="submit" loading={guardar.isPending}>Guardar feriado</Button></div></form></Modal>
    <ConfirmDialog open={Boolean(baja)} onOpenChange={v=>!v&&setBaja(null)} title="Desactivar feriado" description={`“${baja?.nombre??''}” dejará de considerarse en los próximos registros.`} confirmLabel="Desactivar" loading={eliminar.isPending} onConfirm={()=>baja&&eliminar.mutate(baja.id)}/>
  </>;
}

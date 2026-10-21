import { openDB, type DBSchema } from 'idb';

export type TipoColaPwa='asistencia'|'tareo'|'foto';
export type EstadoColaPwa='pendiente'|'sincronizando'|'sincronizado'|'error';
export type EntradaColaPwa={id:string;tipo:TipoColaPwa;creadaEn:string;actualizadaEn:string;usuarioId:string;organizacionId:string;payload:Record<string,unknown>;estado:EstadoColaPwa;intentos:number;proximoIntento:number|null;ultimoError:string|null;versionServidor?:string|null};
type CachePwa={id:string;datos:unknown;actualizadoEn:string};
interface BasePwa extends DBSchema {
  pendientes:{key:string;value:EntradaColaPwa;indexes:{'por-estado':'estado';'por-reintento':'proximoIntento'}};
  cache_parcelas:{key:string;value:CachePwa}; cache_cultivos:{key:string;value:CachePwa}; cache_productos:{key:string;value:CachePwa};
  cache_formularios:{key:string;value:CachePwa}; cache_tareas:{key:string;value:CachePwa};
  conflictos:{key:string;value:{id:string;registroId:string;local:unknown;remoto:unknown;detectadoEn:string;resuelto:boolean}};
}
const dbPwa=openDB<BasePwa>('agrosys-campo-offline',3,{upgrade(db,oldVersion,_newVersion,transaction){
  if(oldVersion<1) db.createObjectStore('pendientes',{keyPath:'id'});
  if(oldVersion<2){const store=transaction.objectStore('pendientes');store.createIndex('por-estado','estado');store.createIndex('por-reintento','proximoIntento');}
  if(oldVersion<3){for(const nombre of ['cache_parcelas','cache_cultivos','cache_productos','cache_formularios','cache_tareas'] as const)db.createObjectStore(nombre,{keyPath:'id'});db.createObjectStore('conflictos',{keyPath:'id'});}
}});

// RFC 9562 UUID v7: timestamp Unix en los 48 bits iniciales y aleatoriedad criptográfica.
export function uuidV7(){const bytes=crypto.getRandomValues(new Uint8Array(16)),tiempo=Date.now();for(let i=5;i>=0;i--)bytes[5-i]=(tiempo/2**(i*8))&255;bytes[6]=(bytes[6]!&0x0f)|0x70;bytes[8]=(bytes[8]!&0x3f)|0x80;const h=[...bytes].map(b=>b.toString(16).padStart(2,'0')).join('');return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`}

export async function encolarPwa(tipo:TipoColaPwa,payload:Record<string,unknown>,propietario:{usuarioId:string;organizacionId:string}){const ahora=new Date().toISOString(),entrada:EntradaColaPwa={id:uuidV7(),tipo,creadaEn:ahora,actualizadaEn:ahora,...propietario,payload,estado:'pendiente',intentos:0,proximoIntento:null,ultimoError:null};await(await dbPwa).put('pendientes',entrada);return entrada}
export async function listarColaPwa():Promise<EntradaColaPwa[]>{return(await dbPwa).getAll('pendientes').then(filas=>filas.map(f=>({...f,estado:f.estado??'pendiente',intentos:f.intentos??0,proximoIntento:f.proximoIntento??null,ultimoError:f.ultimoError??null,actualizadaEn:f.actualizadaEn??f.creadaEn})).sort((a,b)=>a.creadaEn.localeCompare(b.creadaEn)))}
export async function quitarDeColaPwa(id:string){await(await dbPwa).delete('pendientes',id)}
export async function actualizarColaPwa(id:string,cambios:Partial<EntradaColaPwa>){const bd=await dbPwa;await bd.put('pendientes',{...((await bd.get('pendientes',id))!),...cambios,actualizadaEn:new Date().toISOString()})}
export async function listarPendientesListos(ahora=Date.now()){const filas=await listarColaPwa();return filas.filter(f=>f.estado==='pendiente'||f.estado==='error'||f.estado==='sincronizando').filter(f=>!f.proximoIntento||f.proximoIntento<=ahora)}
export async function guardarCachePwa(tienda:'cache_parcelas'|'cache_cultivos'|'cache_productos'|'cache_formularios'|'cache_tareas',id:string,datos:unknown){await(await dbPwa).put(tienda,{id,datos,actualizadoEn:new Date().toISOString()})}
export async function leerCachePwa<T>(tienda:'cache_parcelas'|'cache_cultivos'|'cache_productos'|'cache_formularios'|'cache_tareas',id:string):Promise<T|undefined>{return(await dbPwa).get(tienda,id).then(f=>f?.datos as T|undefined)}
export async function registrarConflictoPwa(registroId:string,local:unknown,remoto:unknown){const id=uuidV7();await(await dbPwa).put('conflictos',{id,registroId,local,remoto,detectadoEn:new Date().toISOString(),resuelto:false});return id}
export function milisegundosReintento(intento:number){return [1000,5000,30000,300000,1800000][Math.min(Math.max(intento-1,0),4)]!}

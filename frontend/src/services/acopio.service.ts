import { api } from '../lib/api';
export type AcopioData={producers:any[];silos:any[];qualityTables:any[];receptions:any[];inventory:any[];contracts:any[];movements:any[]};
export const acopioService={resumen:()=>api<{data:AcopioData}>('/acopio'),crear:(path:string,data:unknown)=>api(`/acopio/${path}`,{method:'POST',body:JSON.stringify(data)})};

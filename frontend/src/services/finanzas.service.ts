import { api } from '../lib/api';

export type FinanceData={cashNet:string;accounts:Record<string,any>[];documents:Record<string,any>[];movements:Record<string,any>[];budgets:Record<string,any>[];centers:Record<string,any>[];chartAccounts:Record<string,any>[];journals:Record<string,any>[];assets:Record<string,any>[]};
export const finanzasService={
 resumen:()=>api<{data:FinanceData}>('/finanzas'),
 crear:(path:string,payload:unknown)=>api(`/finanzas/${path}`,{method:'POST',body:JSON.stringify(payload)}),
};

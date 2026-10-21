import {clsx,type ClassValue} from 'clsx'; import {twMerge} from 'tailwind-merge'; export const cn=(...v:ClassValue[])=>twMerge(clsx(v));
export const money=(value:string|number)=>new Intl.NumberFormat('es-BO',{style:'currency',currency:'BOB'}).format(Number(value)); export const date=(value:string)=>new Intl.DateTimeFormat('es-BO',{dateStyle:'medium'}).format(new Date(value));
export const dateTime=(value:string)=>new Intl.DateTimeFormat('es-BO',{dateStyle:'medium',timeStyle:'short',timeZone:'America/La_Paz'}).format(new Date(value));
export const quantity=(value:string|number,decimals=3)=>new Intl.NumberFormat('es-BO',{maximumFractionDigits:decimals}).format(Number(value));

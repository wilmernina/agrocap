const formato=(fecha:Date)=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/La_Paz',year:'numeric',month:'2-digit',day:'2-digit'}).format(fecha);
export const hoy=()=>formato(new Date());
export const haceDias=(dias:number)=>{const fecha=new Date();fecha.setDate(fecha.getDate()-dias);return formato(fecha)};
export const inicioMes=()=>{const ahora=new Date();return formato(new Date(ahora.getFullYear(),ahora.getMonth(),1))};
export const finMes=()=>{const ahora=new Date();return formato(new Date(ahora.getFullYear(),ahora.getMonth()+1,0))};

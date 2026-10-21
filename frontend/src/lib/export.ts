export function descargarCsv(nombre:string,encabezados:string[],filas:Array<Array<string|number>>){
  const escapar=(valor:string|number)=>`"${String(valor).replaceAll('"','""')}"`;
  const contenido='\uFEFF'+[encabezados,...filas].map(fila=>fila.map(escapar).join(';')).join('\r\n');
  const url=URL.createObjectURL(new Blob([contenido],{type:'text/csv;charset=utf-8'}));
  const enlace=document.createElement('a');enlace.href=url;enlace.download=`${nombre}.csv`;enlace.click();URL.revokeObjectURL(url);
}

export async function descargarPdf(titulo:string,nombre:string,encabezados:string[],filas:Array<Array<string|number>>,resumen?:string){
  const [{jsPDF},{default:autoTable}]=await Promise.all([import('jspdf'),import('jspdf-autotable')]);
  const documento=new jsPDF({orientation:encabezados.length>6?'landscape':'portrait'});
  documento.setFontSize(16);documento.text('AgroCAP',14,16);documento.setFontSize(12);documento.text(titulo,14,24);
  if(resumen){documento.setFontSize(9);documento.setTextColor(90);documento.text(resumen,14,31)}
  autoTable(documento,{head:[encabezados],body:filas,startY:resumen?37:31,styles:{fontSize:8,cellPadding:2},headStyles:{fillColor:[30,89,52]}});
  documento.save(`${nombre}.pdf`);
}

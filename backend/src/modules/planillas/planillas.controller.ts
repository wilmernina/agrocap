import type { Response } from 'express';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { idSchema } from '../../shared/schemas.ts';
import type { AuthRequest } from '../../shared/types.ts';
import { actualizarPlanillaSchema, consultaPeriodosSchema, facturaRcIvaSchema, pagarPeriodoSchema, pagarPlanillaSchema, periodoSchema } from './planillas.schemas.ts';
import { PlanillasService } from './planillas.service.ts';

const servicio = new PlanillasService();
const contexto = (req: AuthRequest) => ({ organizacionId: req.user!.organizationId, usuarioId: req.user!.id, ip: req.ip });
const bs = (n: string | number) => Number(n).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export async function listarPeriodos(req: AuthRequest, res: Response) { const q = consultaPeriodosSchema.parse(req.query), r = await servicio.listarPeriodos(req.user!.organizationId, q); res.json({ data: r.data, meta: { pagina: q.pagina, limite: q.limite, total: r.total, paginas: Math.ceil(r.total / q.limite) } }); }
export async function crearPeriodo(req: AuthRequest, res: Response) { res.status(201).json({ data: await servicio.crearPeriodo(periodoSchema.parse(req.body), contexto(req)) }); }
export async function obtenerPeriodo(req: AuthRequest, res: Response) { res.json({ data: await servicio.obtenerPeriodo(req.user!.organizationId, idSchema.parse(req.params.id)) }); }
export async function calcularPeriodo(req: AuthRequest, res: Response) { res.json({ data: await servicio.calcularPeriodo(req.user!.organizationId, idSchema.parse(req.params.id), contexto(req)) }); }
export async function cerrarPeriodo(req: AuthRequest, res: Response) { res.json({ data: await servicio.cerrar(req.user!.organizationId, idSchema.parse(req.params.id), contexto(req)) }); }
export async function pagarPeriodo(req: AuthRequest, res: Response) { res.json({ data: await servicio.pagarPeriodo(req.user!.organizationId, idSchema.parse(req.params.id), pagarPeriodoSchema.parse(req.body), contexto(req)) }); }
export async function anularPeriodo(req: AuthRequest, res: Response) { res.json({ data: await servicio.anular(req.user!.organizationId, idSchema.parse(req.params.id), contexto(req)) }); }
export async function obtenerPlanilla(req: AuthRequest, res: Response) { res.json({ data: await servicio.detallePlanilla(req.user!.organizationId, idSchema.parse(req.params.id)) }); }
export async function actualizarPlanilla(req: AuthRequest, res: Response) { res.json({ data: await servicio.ajustarPlanilla(req.user!.organizationId, idSchema.parse(req.params.id), actualizarPlanillaSchema.parse(req.body), contexto(req)) }); }
export async function pagarPlanilla(req: AuthRequest, res: Response) { res.json({ data: await servicio.pagarPlanilla(req.user!.organizationId, idSchema.parse(req.params.id), pagarPlanillaSchema.parse(req.body), contexto(req)) }); }
export async function facturasPlanilla(req: AuthRequest, res: Response) { res.json({ data: await servicio.listarFacturas(req.user!.organizationId, idSchema.parse(req.params.id)) }); }
export async function agregarFactura(req: AuthRequest, res: Response) { res.status(201).json({ data: await servicio.agregarFactura(req.user!.organizationId, idSchema.parse(req.params.id), facturaRcIvaSchema.parse(req.body), contexto(req)) }); }
export async function eliminarFactura(req: AuthRequest, res: Response) { res.json({ data: await servicio.eliminarFactura(req.user!.organizationId, idSchema.parse(req.params.id), contexto(req)) }); }

export async function exportarExcel(req: AuthRequest, res: Response) {
  const { periodo, filas } = await servicio.exportarPeriodo(req.user!.organizationId, idSchema.parse(req.params.id));
  const libro = new ExcelJS.Workbook(), hoja = libro.addWorksheet('Planilla');
  hoja.columns = [
    { header: 'Código', key: 'codigo', width: 15 }, { header: 'Empleado', key: 'empleado', width: 30 }, { header: 'CI', key: 'ci', width: 16 },
    { header: 'Cargo', key: 'cargo', width: 18 }, { header: 'Días', key: 'dias', width: 10 }, { header: 'Total ganado (Bs.)', key: 'ganado', width: 20 },
    { header: 'AFP laboral (Bs.)', key: 'afp', width: 19 }, { header: 'Comisión AFP (detalle)', key: 'comision', width: 22 }, { header: 'RC-IVA (Bs.)', key: 'rciva', width: 16 },
    { header: 'Aporte solidario (Bs.)', key: 'solidario', width: 22 }, { header: 'Otros descuentos (Bs.)', key: 'otros', width: 23 }, { header: 'Descuentos (Bs.)', key: 'descuentos', width: 20 },
    { header: 'Líquido pagable (Bs.)', key: 'liquido', width: 22 }, { header: 'Estado', key: 'estado', width: 14 },
  ];
  for (const { planilla: p, empleado: e } of filas) hoja.addRow({ codigo: e.codigo, empleado: `${e.nombres} ${e.apellidos}`, ci: e.ci, cargo: e.cargo, dias: Number(p.diasTrabajados), ganado: Number(p.totalGanado), afp: Number(p.aporteAfp), comision: Number(p.aporteAfpComision), rciva: Number(p.rcIva), solidario: Number(p.aporteSolidario), otros: Array.isArray(p.otrosDescuentos) ? p.otrosDescuentos.reduce((s, x) => s + Number((x as { monto: string }).monto), 0) : 0, descuentos: Number(p.totalDescuentos), liquido: Number(p.liquidoPagable), estado: p.estado });
  hoja.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }; hoja.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF17633D' } };
  for (const key of ['ganado', 'afp', 'comision', 'rciva', 'solidario', 'otros', 'descuentos', 'liquido']) hoja.getColumn(key).numFmt = '#,##0.00';
  hoja.views = [{ state: 'frozen', ySplit: 1 }];
  const archivo = Buffer.from(await libro.xlsx.writeBuffer());
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="planilla-${periodo.gestion}-${String(periodo.mes).padStart(2, '0')}-${periodo.quincena ?? 'mensual'}.xlsx"`); res.send(archivo);
}

export async function boletaPdf(req: AuthRequest, res: Response) {
  const f = await servicio.datosBoleta(req.user!.organizationId, idSchema.parse(req.params.id));
  const doc = new PDFDocument({ size: 'A4', margin: 48 }); const trozos: Buffer[] = [];
  const generado = new Promise<Buffer>((resolve, reject) => { doc.on('data', (trozo: Buffer) => trozos.push(trozo)); doc.on('end', () => resolve(Buffer.concat(trozos))); doc.on('error', reject); });
  doc.fontSize(19).fillColor('#17633d').text('AGROCAP', { align: 'center' }).moveDown(0.25);
  doc.fontSize(13).fillColor('#1c1917').text('BOLETA DE PAGO', { align: 'center' }).moveDown();
  doc.fontSize(10).text(`N.º ${f.boleta!.numeroBoleta}`, { align: 'right' });
  doc.text(`Período: ${f.periodo.tipo === 'mensual' ? 'Mensual' : `Quincena ${f.periodo.quincena}`} · ${String(f.periodo.mes).padStart(2, '0')}/${f.periodo.gestion}`);
  doc.text(`Desde ${f.periodo.fechaInicio} hasta ${f.periodo.fechaFin}`).moveDown();
  doc.fontSize(11).text(`${f.empleado.nombres} ${f.empleado.apellidos}`, { continued: true }).fontSize(10).text(`   CI ${f.empleado.ci}   Código ${f.empleado.codigo}`);
  doc.text(`Cargo: ${f.empleado.cargo}   ·   Días trabajados: ${f.planilla.diasTrabajados}`).moveDown();
  const inicio = doc.y; doc.fontSize(10).fillColor('#44403c').text('CONCEPTO', 52, inicio, { width: 350 }).text('MONTO (Bs.)', 410, inicio, { width: 130, align: 'right' });
  doc.moveTo(52, doc.y + 3).lineTo(543, doc.y + 3).strokeColor('#a8a29e').stroke(); doc.moveDown(0.7);
  for (const c of f.conceptos) { const y = doc.y; doc.fillColor(c.tipo === 'ingreso' ? '#17633d' : '#b42318').text(`${c.tipo === 'ingreso' ? '+' : '−'} ${c.concepto}`, 52, y, { width: 350 }); doc.text(bs(c.monto), 410, y, { width: 130, align: 'right' }); doc.moveDown(0.35); }
  doc.moveDown(); doc.fillColor('#1c1917').fontSize(11).text(`Total ganado: Bs. ${bs(f.planilla.totalGanado)}`, { align: 'right' });
  doc.fillColor('#b42318').text(`Total descuentos: Bs. ${bs(f.planilla.totalDescuentos)}`, { align: 'right' });
  doc.moveDown(0.5).fillColor('#17633d').fontSize(14).text(`LÍQUIDO PAGABLE: Bs. ${bs(f.planilla.liquidoPagable)}`, { align: 'right' });
  doc.moveDown(2).fillColor('#57534e').fontSize(9).text(`AFP laboral ${bs(f.planilla.aporteAfp)} Bs. (incluye comisión AFP de ${bs(f.planilla.aporteAfpComision)} Bs.).`, { align: 'left' });
  doc.moveDown(4).fillColor('#78716c').text('Firma del empleador                                      Firma del trabajador', { align: 'center' });
  doc.moveDown(2).fontSize(8).text('Documento generado por AgroCAP. Revise los conceptos con su responsable de planillas.', { align: 'center' }); doc.end();
  const archivo = await generado; res.setHeader('Content-Type', 'application/pdf'); res.setHeader('Content-Disposition', `inline; filename="${f.boleta!.numeroBoleta}.pdf"`); res.send(archivo);
}

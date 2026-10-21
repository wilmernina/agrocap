import type { Response } from 'express';
import { idSchema } from '../../shared/schemas.ts';
import type { AuthRequest } from '../../shared/types.ts';
import { asistenciaFechaSchema, actualizarAsistenciaSchema, consultaAsistenciaSchema, loteAsistenciaSchema, marcarAsistenciaSchema, resumenAsistenciaSchema } from './asistencias.schemas.ts';
import { AsistenciasService } from './asistencias.service.ts';
import { actualizarTareoSchema, consultaTareosSchema, tareoSchema } from './tareos.schemas.ts';
import { TareosService } from './tareos.service.ts';

const asistencias = new AsistenciasService(), tareos = new TareosService();
const contexto = (req: AuthRequest) => ({ organizacionId: req.user!.organizationId, usuarioId: req.user!.id, ip: req.ip });

export async function listarAsistencias(req: AuthRequest, res: Response) { const q = consultaAsistenciaSchema.parse(req.query); const r = await asistencias.listar(req.user!.organizationId, q); res.json({ data: r.data, meta: { pagina: q.pagina, limite: q.limite, total: r.total, paginas: Math.ceil(r.total / q.limite) } }); }
export async function asistenciasPorFecha(req: AuthRequest, res: Response) { const q = asistenciaFechaSchema.parse(req.query); res.json({ data: await asistencias.porFecha(req.user!.organizationId, q.fecha) }); }
export async function crearAsistencias(req: AuthRequest, res: Response) { const q = loteAsistenciaSchema.parse(req.body); res.status(201).json({ data: await asistencias.crearLote(q.asistencias, contexto(req)) }); }
export async function marcarAsistencia(req: AuthRequest, res: Response) { const q = marcarAsistenciaSchema.parse(req.body); res.status(201).json({ data: await asistencias.marcar(req.user!.organizationId, q, contexto(req)) }); }
export async function actualizarAsistencia(req: AuthRequest, res: Response) { const id = idSchema.parse(req.params.id), q = actualizarAsistenciaSchema.parse(req.body); res.json({ data: await asistencias.actualizar(req.user!.organizationId, id, q, contexto(req)) }); }
export async function resumenAsistencias(req: AuthRequest, res: Response) { const q = resumenAsistenciaSchema.parse(req.query); res.json({ data: await asistencias.resumen(req.user!.organizationId, q.mes, q.gestion) }); }
export async function reporteMensualEmpleado(req: AuthRequest, res: Response) { const q = resumenAsistenciaSchema.parse(req.query), empleadoId = idSchema.parse(req.query.empleado); const data = await asistencias.resumen(req.user!.organizationId, q.mes, q.gestion); const fila = data.find(r => r.empleado.id === empleadoId); if (!fila) return res.json({ data: { empleadoId, mes: q.mes, gestion: q.gestion, diasTrabajados: 0, asistencias: [] } }); res.json({ data: fila }); }

export async function listarTareos(req: AuthRequest, res: Response) { const q = consultaTareosSchema.parse(req.query); const r = await tareos.listar(req.user!.organizationId, q); res.json({ data: r.data, meta: { pagina: q.pagina, limite: q.limite, total: r.total, paginas: Math.ceil(r.total / q.limite) } }); }
export async function obtenerTareo(req: AuthRequest, res: Response) { res.json({ data: await tareos.obtener(req.user!.organizationId, idSchema.parse(req.params.id)) }); }
export async function crearTareo(req: AuthRequest, res: Response) { res.status(201).json({ data: await tareos.crear(tareoSchema.parse(req.body), contexto(req)) }); }
export async function actualizarTareo(req: AuthRequest, res: Response) { res.json({ data: await tareos.actualizar(req.user!.organizationId, idSchema.parse(req.params.id), actualizarTareoSchema.parse(req.body), contexto(req)) }); }
export async function aprobarTareo(req: AuthRequest, res: Response) { res.json({ data: await tareos.aprobar(req.user!.organizationId, idSchema.parse(req.params.id), contexto(req)) }); }
export async function eliminarTareo(req: AuthRequest, res: Response) { res.json({ data: await tareos.eliminar(req.user!.organizationId, idSchema.parse(req.params.id), contexto(req)) }); }
export async function tareosPendientes(req: AuthRequest, res: Response) { res.json({ data: await tareos.pendientes(req.user!.organizationId) }); }

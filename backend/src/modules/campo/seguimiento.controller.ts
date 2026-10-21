import type { Response } from 'express';
import { idSchema } from '../../shared/schemas.ts';
import type { AuthRequest } from '../../shared/types.ts';
import {
  actividadSchema, actualizarActividadSchema, actualizarCicloSchema, actualizarCultivoSchema, actualizarMonitoreoSchema,
  cosechaSchema, consultaActividadesSchema, consultaCiclosSchema, consultaCultivosSchema, consultaFotosSchema,
  consultaMonitoreoSchema, cultivoSchema, cicloSchema, fotoCampoSchema, monitoreoSchema,
} from './seguimiento.schemas.ts';
import { SeguimientoService } from './seguimiento.service.ts';
import { ejecutarConIdempotencia } from '../sync/sync.controller.ts';

const service = new SeguimientoService();
const contexto = (req: AuthRequest) => ({ organizacionId: req.user!.organizationId, usuarioId: req.user!.id, ip: req.ip });
const meta = (q: { pagina: number; limite: number }, total: number) => ({ pagina: q.pagina, limite: q.limite, total, paginas: Math.ceil(total / q.limite) });

export async function listarCultivos(req: AuthRequest, res: Response) { const q = consultaCultivosSchema.parse(req.query); const r = await service.listarCultivos(req.user!.organizationId, q); res.json({ data: r.data, meta: meta(q, r.total) }); }
export async function obtenerCultivo(req: AuthRequest, res: Response) { res.json({ data: await service.obtenerCultivo(req.user!.organizationId, idSchema.parse(req.params.id)) }); }
export async function crearCultivo(req: AuthRequest, res: Response) { res.status(201).json({ data: await service.crearCultivo(cultivoSchema.parse(req.body), contexto(req)) }); }
export async function actualizarCultivo(req: AuthRequest, res: Response) { res.json({ data: await service.actualizarCultivo(idSchema.parse(req.params.id), actualizarCultivoSchema.parse(req.body), contexto(req)) }); }
export async function desactivarCultivo(req: AuthRequest, res: Response) { res.json({ data: await service.desactivarCultivo(idSchema.parse(req.params.id), contexto(req)) }); }
export async function ciclosDeCultivo(req: AuthRequest, res: Response) { res.json({ data: await service.ciclosDeCultivo(req.user!.organizationId, idSchema.parse(req.params.id)) }); }

export async function listarCiclos(req: AuthRequest, res: Response) { const q = consultaCiclosSchema.parse(req.query); const r = await service.listarCiclos(req.user!.organizationId, q); res.json({ data: r.data, meta: meta(q, r.total) }); }
export async function ciclosActivos(req: AuthRequest, res: Response) { res.json({ data: await service.ciclosActivos(req.user!.organizationId) }); }
export async function obtenerCiclo(req: AuthRequest, res: Response) { res.json({ data: await service.obtenerCiclo(req.user!.organizationId, idSchema.parse(req.params.id)) }); }
export async function crearCiclo(req: AuthRequest, res: Response) { res.status(201).json({ data: await service.crearCiclo(cicloSchema.parse(req.body), contexto(req)) }); }
export async function actualizarCiclo(req: AuthRequest, res: Response) { res.json({ data: await service.actualizarCiclo(idSchema.parse(req.params.id), actualizarCicloSchema.parse(req.body), contexto(req)) }); }
export async function perderCiclo(req: AuthRequest, res: Response) { res.json({ data: await service.desactivarCiclo(idSchema.parse(req.params.id), contexto(req)) }); }
export async function cosecharCiclo(req: AuthRequest, res: Response) { const datos = cosechaSchema.parse(req.body); res.json({ data: await service.cosecharCiclo(idSchema.parse(req.params.id), datos.rendimientoReal, datos.fechaCosechaReal, datos.observaciones, contexto(req)) }); }

export async function listarActividades(req: AuthRequest, res: Response) { const q = consultaActividadesSchema.parse(req.query); const r = await service.listarActividades(req.user!.organizationId, q); res.json({ data: r.data, meta: meta(q, r.total) }); }
export async function obtenerActividad(req: AuthRequest, res: Response) { res.json({ data: await service.obtenerActividad(req.user!.organizationId, idSchema.parse(req.params.id)) }); }
export async function crearActividad(req: AuthRequest, res: Response) { res.status(201).json({ data: await service.crearActividad(actividadSchema.parse(req.body), contexto(req)) }); }
export async function actualizarActividad(req: AuthRequest, res: Response) { res.json({ data: await service.actualizarActividad(idSchema.parse(req.params.id), actualizarActividadSchema.parse(req.body), contexto(req)) }); }
export async function eliminarActividad(req: AuthRequest, res: Response) { res.json({ data: await service.eliminarActividad(idSchema.parse(req.params.id), contexto(req)) }); }

export async function listarMonitoreo(req: AuthRequest, res: Response) { const q = consultaMonitoreoSchema.parse(req.query); const r = await service.listarMonitoreo(req.user!.organizationId, q) as { data: unknown[]; total: number }; res.json({ data: r.data, meta: meta(q, r.total) }); }
export async function alertasMonitoreo(req: AuthRequest, res: Response) { const q = consultaMonitoreoSchema.parse(req.query); res.json({ data: await service.alertasMonitoreo(req.user!.organizationId, q) }); }
export async function obtenerMonitoreo(req: AuthRequest, res: Response) { res.json({ data: await service.obtenerMonitoreo(req.user!.organizationId, idSchema.parse(req.params.id)) }); }
export async function crearMonitoreo(req: AuthRequest, res: Response) { res.status(201).json({ data: await service.crearMonitoreo(monitoreoSchema.parse(req.body), contexto(req)) }); }
export async function actualizarMonitoreo(req: AuthRequest, res: Response) { res.json({ data: await service.actualizarMonitoreo(idSchema.parse(req.params.id), actualizarMonitoreoSchema.parse(req.body), contexto(req)) }); }
export async function eliminarMonitoreo(req: AuthRequest, res: Response) { res.json({ data: await service.eliminarMonitoreo(idSchema.parse(req.params.id), contexto(req)) }); }

export async function listarFotos(req: AuthRequest, res: Response) { const q = consultaFotosSchema.parse(req.query); const r = await service.listarFotos(req.user!.organizationId, q); res.json({ data: r.data, meta: meta(q, r.total) }); }
export async function geojsonFotos(req: AuthRequest, res: Response) { res.json(await service.geojsonFotos(req.user!.organizationId)); }
export async function crearFoto(req: AuthRequest, res: Response) { const datos = fotoCampoSchema.parse(req.body); res.status(201).json({ data: await ejecutarConIdempotencia(req, 'foto', () => service.crearFoto(datos, req.file?.buffer, contexto(req))) }); }
export async function eliminarFoto(req: AuthRequest, res: Response) { res.json({ data: await service.eliminarFoto(req.user!.organizationId, idSchema.parse(req.params.id), contexto(req)) }); }

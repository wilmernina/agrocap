import { z } from 'zod';
import type { Response } from 'express';
import type { AuthRequest } from '../../shared/types.ts';
import { consultaCostosPersonalSchema, consultaGestionMesSchema } from './laborales.schemas.ts';
import { ReportesLaboralesService } from './laborales.service.ts';

const servicio = new ReportesLaboralesService();
const consultaMesRequerido = consultaGestionMesSchema.extend({ mes: z.coerce.number().int().min(1).max(12) });
const consultaGestion = z.object({ gestion: z.coerce.number().int().min(2000).max(2200).optional() });

export async function planillasMensual(req: AuthRequest, res: Response) { const q = consultaMesRequerido.parse(req.query); res.json({ data: await servicio.planillasMensual(req.user!.organizationId, q.gestion, q.mes) }); }
export async function costosPersonalPorParcela(req: AuthRequest, res: Response) { const q = consultaCostosPersonalSchema.parse(req.query), r = await servicio.costosPersonalPorParcela(req.user!.organizationId, q.desde, q.hasta); res.json({ data: r.rows }); }
export async function antiguedadEmpleados(req: AuthRequest, res: Response) { const r = await servicio.antiguedadEmpleados(req.user!.organizationId); res.json({ data: r.rows }); }
export async function provisiones(req: AuthRequest, res: Response) { const q = consultaGestionMesSchema.pick({ gestion: true }).parse(req.query), r = await servicio.provisiones(req.user!.organizationId, q.gestion); res.json({ data: r.rows }); }
export async function aportesAfp(req: AuthRequest, res: Response) { const q = consultaMesRequerido.parse(req.query), r = await servicio.aportesAfp(req.user!.organizationId, q.gestion, q.mes); res.json({ data: r.rows }); }
export async function rcIvaEmpleados(req: AuthRequest, res: Response) { const q = consultaMesRequerido.parse(req.query), r = await servicio.rcIvaEmpleados(req.user!.organizationId, q.gestion, q.mes); res.json({ data: r.rows }); }
export async function libroMayoresManoObra(req: AuthRequest, res: Response) { const q = consultaGestion.parse(req.query), r = await servicio.libroMayoresManoObra(req.user!.organizationId, q.gestion); res.json({ data: r.rows }); }

import type { Response } from 'express';
import { idSchema } from '../../shared/schemas.ts';
import type { AuthRequest } from '../../shared/types.ts';
import { actualizarAlmacenSchema, almacenSchema } from './almacenes.schemas.ts';
import { AlmacenesService } from './almacenes.service.ts';

const service = new AlmacenesService();
const contexto = (req: AuthRequest) => ({ organizacionId: req.user!.organizationId, usuarioId: req.user!.id, ip: req.ip });

export async function listar(req: AuthRequest, res: Response) { res.json({ data: await service.listar(req.user!.organizationId) }); }
export async function crear(req: AuthRequest, res: Response) { res.status(201).json({ data: await service.crear(almacenSchema.parse(req.body), contexto(req)) }); }
export async function actualizar(req: AuthRequest, res: Response) { res.json({ data: await service.actualizar(idSchema.parse(req.params.id), actualizarAlmacenSchema.parse(req.body), contexto(req)) }); }
export async function desactivar(req: AuthRequest, res: Response) { res.json({ data: await service.desactivar(idSchema.parse(req.params.id), contexto(req)) }); }

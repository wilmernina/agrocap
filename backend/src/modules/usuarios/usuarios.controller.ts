import type { Response } from 'express';
import { idSchema, paginationSchema } from '../../shared/schemas.ts';
import type { AuthRequest } from '../../shared/types.ts';
import { actualizarUsuarioSchema, crearUsuarioSchema } from './usuarios.schemas.ts';
import { UsuariosService } from './usuarios.service.ts';

const service = new UsuariosService();
const contexto = (req: AuthRequest) => ({ actorId: req.user!.id, ip: req.ip });

export async function listarUsuarios(req: AuthRequest, res: Response) {
  const consulta = paginationSchema.parse(req.query);
  const resultado = await service.listar(req.user!.organizationId, consulta.page, consulta.limit, consulta.search);
  res.json({ ...resultado, meta: { page: consulta.page, limit: consulta.limit, total: resultado.total } });
}
export async function obtenerUsuario(req: AuthRequest, res: Response) {
  res.json({ data: await service.obtener(req.user!.organizationId, idSchema.parse(req.params.id)) });
}
export async function crearUsuario(req: AuthRequest, res: Response) {
  res.status(201).json({ data: await service.crear(req.user!.organizationId, crearUsuarioSchema.parse(req.body), contexto(req)) });
}
export async function actualizarUsuario(req: AuthRequest, res: Response) {
  res.json({ data: await service.actualizar(req.user!.organizationId, idSchema.parse(req.params.id), actualizarUsuarioSchema.parse(req.body), contexto(req)) });
}
export async function desactivarUsuario(req: AuthRequest, res: Response) {
  res.json({ data: await service.desactivar(req.user!.organizationId, idSchema.parse(req.params.id), contexto(req)) });
}

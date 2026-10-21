import type { Response } from 'express';
import { consultaPaginadaSchema } from '../../shared/consultas.ts';
import { idSchema } from '../../shared/schemas.ts';
import type { AuthRequest } from '../../shared/types.ts';
import { actualizarCategoriaSchema, actualizarUnidadSchema, categoriaSchema, unidadSchema } from './catalogos.schemas.ts';
import { CatalogosService } from './catalogos.service.ts';

const service = new CatalogosService();
const contexto = (req: AuthRequest) => ({ organizacionId: req.user!.organizationId, usuarioId: req.user!.id, ip: req.ip });
const meta = (q: { pagina: number; limite: number }, total: number) => ({ pagina: q.pagina, limite: q.limite, total, paginas: Math.ceil(total / q.limite) });

export async function listarCategorias(req: AuthRequest, res: Response) { const q = consultaPaginadaSchema.parse(req.query); const resultado = await service.listarCategorias(req.user!.organizationId, q.pagina, q.limite, q.busqueda, q.activo); res.json({ data: resultado.data, meta: meta(q, resultado.total) }); }
export async function obtenerCategoria(req: AuthRequest, res: Response) { res.json({ data: await service.obtenerCategoria(req.user!.organizationId, idSchema.parse(req.params.id)) }); }
export async function crearCategoria(req: AuthRequest, res: Response) { res.status(201).json({ data: await service.crearCategoria(categoriaSchema.parse(req.body), contexto(req)) }); }
export async function actualizarCategoria(req: AuthRequest, res: Response) { res.json({ data: await service.actualizarCategoria(idSchema.parse(req.params.id), actualizarCategoriaSchema.parse(req.body), contexto(req)) }); }
export async function desactivarCategoria(req: AuthRequest, res: Response) { res.json({ data: await service.desactivarCategoria(idSchema.parse(req.params.id), contexto(req)) }); }
export async function listarUnidades(req: AuthRequest, res: Response) { const q = consultaPaginadaSchema.parse(req.query); const resultado = await service.listarUnidades(req.user!.organizationId, q.pagina, q.limite, q.busqueda, q.activo); res.json({ data: resultado.data, meta: meta(q, resultado.total) }); }
export async function obtenerUnidad(req: AuthRequest, res: Response) { res.json({ data: await service.obtenerUnidad(req.user!.organizationId, idSchema.parse(req.params.id)) }); }
export async function crearUnidad(req: AuthRequest, res: Response) { res.status(201).json({ data: await service.crearUnidad(unidadSchema.parse(req.body), contexto(req)) }); }
export async function actualizarUnidad(req: AuthRequest, res: Response) { res.json({ data: await service.actualizarUnidad(idSchema.parse(req.params.id), actualizarUnidadSchema.parse(req.body), contexto(req)) }); }
export async function desactivarUnidad(req: AuthRequest, res: Response) { res.json({ data: await service.desactivarUnidad(idSchema.parse(req.params.id), contexto(req)) }); }

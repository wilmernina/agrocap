import type { Response } from 'express';
import { idSchema } from '../../shared/schemas.ts';
import type { AuthRequest } from '../../shared/types.ts';
import { actualizarProductoSchema, consultaProductosSchema, crearProductoSchema } from './productos.schemas.ts';
import { ProductosService } from './productos.service.ts';

const service = new ProductosService();
const contexto = (req: AuthRequest) => ({ organizacionId: req.user!.organizationId, usuarioId: req.user!.id, ip: req.ip });
export async function listarProductos(req: AuthRequest, res: Response) { const consulta = consultaProductosSchema.parse(req.query); const resultado = await service.listar(req.user!.organizationId, consulta); res.json({ data: resultado.data, meta: { pagina: consulta.pagina, limite: consulta.limite, total: resultado.total, paginas: Math.ceil(resultado.total / consulta.limite) } }); }
export async function alertasStock(req: AuthRequest, res: Response) { res.json({ data: await service.alertasStock(req.user!.organizationId) }); }
export async function obtenerProducto(req: AuthRequest, res: Response) { res.json({ data: await service.obtener(req.user!.organizationId, idSchema.parse(req.params.id)) }); }
export async function crearProducto(req: AuthRequest, res: Response) { res.status(201).json({ data: await service.crear(crearProductoSchema.parse(req.body), contexto(req)) }); }
export async function actualizarProducto(req: AuthRequest, res: Response) { res.json({ data: await service.actualizar(idSchema.parse(req.params.id), actualizarProductoSchema.parse(req.body), contexto(req)) }); }
export async function desactivarProducto(req: AuthRequest, res: Response) { res.json({ data: await service.desactivar(idSchema.parse(req.params.id), contexto(req)) }); }

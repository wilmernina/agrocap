import type { Response } from 'express';
import { consultaPaginadaSchema } from '../../shared/consultas.ts';
import { idSchema } from '../../shared/schemas.ts';
import type { AuthRequest } from '../../shared/types.ts';
import { actualizarClienteSchema, actualizarProveedorSchema, clienteSchema, proveedorSchema } from './terceros.schemas.ts';
import { TercerosService } from './terceros.service.ts';

const service = new TercerosService();
const contexto = (req: AuthRequest) => ({ organizacionId: req.user!.organizationId, usuarioId: req.user!.id, ip: req.ip });
const responderLista = (res: Response, q: { pagina: number; limite: number }, resultado: { data: unknown[]; total: number }) => res.json({ data: resultado.data, meta: { pagina: q.pagina, limite: q.limite, total: resultado.total, paginas: Math.ceil(resultado.total / q.limite) } });
export async function listarClientes(req: AuthRequest, res: Response) { const q = consultaPaginadaSchema.parse(req.query); responderLista(res, q, await service.listarClientes(req.user!.organizationId, q.pagina, q.limite, q.busqueda, q.activo)); }
export async function obtenerCliente(req: AuthRequest, res: Response) { res.json({ data: await service.obtenerCliente(req.user!.organizationId, idSchema.parse(req.params.id)) }); }
export async function crearCliente(req: AuthRequest, res: Response) { res.status(201).json({ data: await service.crearCliente(clienteSchema.parse(req.body), contexto(req)) }); }
export async function actualizarCliente(req: AuthRequest, res: Response) { res.json({ data: await service.actualizarCliente(idSchema.parse(req.params.id), actualizarClienteSchema.parse(req.body), contexto(req)) }); }
export async function desactivarCliente(req: AuthRequest, res: Response) { res.json({ data: await service.desactivarCliente(idSchema.parse(req.params.id), contexto(req)) }); }
export async function listarProveedores(req: AuthRequest, res: Response) { const q = consultaPaginadaSchema.parse(req.query); responderLista(res, q, await service.listarProveedores(req.user!.organizationId, q.pagina, q.limite, q.busqueda, q.activo)); }
export async function obtenerProveedor(req: AuthRequest, res: Response) { res.json({ data: await service.obtenerProveedor(req.user!.organizationId, idSchema.parse(req.params.id)) }); }
export async function crearProveedor(req: AuthRequest, res: Response) { res.status(201).json({ data: await service.crearProveedor(proveedorSchema.parse(req.body), contexto(req)) }); }
export async function actualizarProveedor(req: AuthRequest, res: Response) { res.json({ data: await service.actualizarProveedor(idSchema.parse(req.params.id), actualizarProveedorSchema.parse(req.body), contexto(req)) }); }
export async function desactivarProveedor(req: AuthRequest, res: Response) { res.json({ data: await service.desactivarProveedor(idSchema.parse(req.params.id), contexto(req)) }); }

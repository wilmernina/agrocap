import type { Response } from 'express';
import { idSchema } from '../../shared/schemas.ts';
import type { AuthRequest } from '../../shared/types.ts';
import {
  actualizarFincaSchema, actualizarLoteParcelaSchema, actualizarParcelaSchema, actualizarPuntoInteresSchema,
  consultaFincasSchema, consultaGeoJsonSchema, consultaParcelasSchema, fincaSchema, loteParcelaSchema,
  parcelaSchema, puntoInteresSchema,
} from './campo.schemas.ts';
import { CampoService } from './campo.service.ts';

const service = new CampoService();
const contexto = (req: AuthRequest) => ({ organizacionId: req.user!.organizationId, usuarioId: req.user!.id, ip: req.ip });
const meta = (q: { pagina: number; limite: number }, total: number) => ({ pagina: q.pagina, limite: q.limite, total, paginas: Math.ceil(total / q.limite) });

export async function listarFincas(req: AuthRequest, res: Response) {
  const q = consultaFincasSchema.parse(req.query); const r = await service.listarFincas(req.user!.organizationId, q);
  res.json({ data: r.data, meta: meta(q, r.total) });
}
export async function obtenerFinca(req: AuthRequest, res: Response) { res.json({ data: await service.obtenerFinca(req.user!.organizationId, idSchema.parse(req.params.id)) }); }
export async function crearFinca(req: AuthRequest, res: Response) { res.status(201).json({ data: await service.crearFinca(fincaSchema.parse(req.body), contexto(req)) }); }
export async function actualizarFinca(req: AuthRequest, res: Response) { res.json({ data: await service.actualizarFinca(idSchema.parse(req.params.id), actualizarFincaSchema.parse(req.body), contexto(req)) }); }
export async function desactivarFinca(req: AuthRequest, res: Response) { res.json({ data: await service.desactivarFinca(idSchema.parse(req.params.id), contexto(req)) }); }
export async function parcelasFinca(req: AuthRequest, res: Response) { res.json({ data: await service.parcelasFinca(req.user!.organizationId, idSchema.parse(req.params.id)) }); }

export async function listarParcelas(req: AuthRequest, res: Response) {
  const q = consultaParcelasSchema.parse(req.query); const r = await service.listarParcelas(req.user!.organizationId, q);
  res.json({ data: r.data, meta: meta(q, r.total) });
}
export async function geojsonParcelas(req: AuthRequest, res: Response) {
  const q = consultaGeoJsonSchema.parse(req.query); const r = await service.geojsonParcelas(req.user!.organizationId, q);
  res.json({ type: 'FeatureCollection', features: r.features, meta: { total: r.features.length, simplificado: r.simplificado } });
}
export async function obtenerParcela(req: AuthRequest, res: Response) { res.json({ data: await service.obtenerParcela(req.user!.organizationId, idSchema.parse(req.params.id)) }); }
export async function crearParcela(req: AuthRequest, res: Response) { res.status(201).json({ data: await service.crearParcela(parcelaSchema.parse(req.body), contexto(req)) }); }
export async function actualizarParcela(req: AuthRequest, res: Response) { res.json({ data: await service.actualizarParcela(idSchema.parse(req.params.id), actualizarParcelaSchema.parse(req.body), contexto(req)) }); }
export async function desactivarParcela(req: AuthRequest, res: Response) { res.json({ data: await service.desactivarParcela(idSchema.parse(req.params.id), contexto(req)) }); }

const fincaOpcional = (req: AuthRequest) => req.query.finca === undefined ? undefined : idSchema.parse(req.query.finca);
const parcelaOpcional = (req: AuthRequest) => req.query.parcela === undefined ? undefined : idSchema.parse(req.query.parcela);
export async function listarLotes(req: AuthRequest, res: Response) { res.json({ data: await service.listarLotes(req.user!.organizationId, parcelaOpcional(req)) }); }
export async function listarLotesParcela(req: AuthRequest, res: Response) { res.json({ data: await service.listarLotes(req.user!.organizationId, idSchema.parse(req.params.id)) }); }
export async function geojsonLotes(req: AuthRequest, res: Response) { res.json(await service.geojsonLotes(req.user!.organizationId, parcelaOpcional(req))); }
export async function obtenerLote(req: AuthRequest, res: Response) { res.json({ data: await service.obtenerLote(req.user!.organizationId, idSchema.parse(req.params.id)) }); }
export async function crearLote(req: AuthRequest, res: Response) { res.status(201).json({ data: await service.crearLote(loteParcelaSchema.parse(req.body), contexto(req)) }); }
export async function actualizarLote(req: AuthRequest, res: Response) { res.json({ data: await service.actualizarLote(idSchema.parse(req.params.id), actualizarLoteParcelaSchema.parse(req.body), contexto(req)) }); }
export async function desactivarLote(req: AuthRequest, res: Response) { res.json({ data: await service.desactivarLote(idSchema.parse(req.params.id), contexto(req)) }); }

export async function listarPuntos(req: AuthRequest, res: Response) { res.json({ data: await service.listarPuntos(req.user!.organizationId, fincaOpcional(req)) }); }
export async function geojsonPuntos(req: AuthRequest, res: Response) { res.json(await service.geojsonPuntos(req.user!.organizationId, fincaOpcional(req))); }
export async function obtenerPunto(req: AuthRequest, res: Response) { res.json({ data: await service.obtenerPunto(req.user!.organizationId, idSchema.parse(req.params.id)) }); }
export async function crearPunto(req: AuthRequest, res: Response) { res.status(201).json({ data: await service.crearPunto(puntoInteresSchema.parse(req.body), contexto(req)) }); }
export async function actualizarPunto(req: AuthRequest, res: Response) { res.json({ data: await service.actualizarPunto(idSchema.parse(req.params.id), actualizarPuntoInteresSchema.parse(req.body), contexto(req)) }); }
export async function eliminarPunto(req: AuthRequest, res: Response) { res.json({ data: await service.eliminarPunto(idSchema.parse(req.params.id), contexto(req)) }); }

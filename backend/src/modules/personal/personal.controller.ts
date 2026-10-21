import type { Response } from 'express';
import { idSchema } from '../../shared/schemas.ts';
import type { AuthRequest } from '../../shared/types.ts';
import { z } from 'zod';
import {
  actualizarCargoSchema, actualizarConfiguracionSchema, actualizarEmpleadoSchema, actualizarFeriadoSchema, aguinaldoQuerySchema, beneficiosQuerySchema,
  bajaEmpleadoSchema, cargoSchema, configuracionSchema, consultaEmpleadosSchema, consultaFeriadosSchema, empleadoSchema, feriadoSchema,
} from './personal.schemas.ts';
import { PersonalService } from './personal.service.ts';

const service = new PersonalService();
const contexto = (req: AuthRequest) => ({ organizacionId: req.user!.organizationId, usuarioId: req.user!.id, ip: req.ip });
const gestionSchema = (value: unknown) => z.coerce.number().int().min(2000).max(2200).parse(value);

export async function listarEmpleados(req: AuthRequest, res: Response) { const q = consultaEmpleadosSchema.parse(req.query); const r = await service.listarEmpleados(req.user!.organizationId, q); res.json({ data: r.data, meta: { pagina: q.pagina, limite: q.limite, total: r.total, paginas: Math.ceil(r.total / q.limite) } }); }
export async function obtenerEmpleado(req: AuthRequest, res: Response) { res.json({ data: await service.obtenerEmpleado(req.user!.organizationId, idSchema.parse(req.params.id)) }); }
export async function crearEmpleado(req: AuthRequest, res: Response) { res.status(201).json({ data: await service.crearEmpleado(empleadoSchema.parse(req.body), contexto(req)) }); }
export async function actualizarEmpleado(req: AuthRequest, res: Response) { res.json({ data: await service.actualizarEmpleado(req.user!.organizationId, idSchema.parse(req.params.id), actualizarEmpleadoSchema.parse(req.body), contexto(req)) }); }
export async function desactivarEmpleado(req: AuthRequest, res: Response) { res.json({ data: await service.desactivarEmpleado(req.user!.organizationId, idSchema.parse(req.params.id), contexto(req)) }); }
export async function darDeBaja(req: AuthRequest, res: Response) { const d = bajaEmpleadoSchema.parse(req.body); res.json({ data: await service.darDeBaja(req.user!.organizationId, idSchema.parse(req.params.id), d.fechaBaja, d.motivoBaja, contexto(req)) }); }
export async function beneficiosEmpleado(req: AuthRequest, res: Response) { const q = beneficiosQuerySchema.parse(req.query); res.json({ data: await service.beneficiosEmpleado(req.user!.organizationId, idSchema.parse(req.params.id), q.fecha) }); }
export async function boletasEmpleado(req: AuthRequest, res: Response) { res.json({ data: await service.boletasEmpleado(req.user!.organizationId, idSchema.parse(req.params.id)) }); }

export async function listarCargos(req: AuthRequest, res: Response) { res.json({ data: await service.listarCargos(req.user!.organizationId) }); }
export async function obtenerCargo(req: AuthRequest, res: Response) { res.json({ data: await service.obtenerCargo(req.user!.organizationId, idSchema.parse(req.params.id)) }); }
export async function crearCargo(req: AuthRequest, res: Response) { res.status(201).json({ data: await service.crearCargo(cargoSchema.parse(req.body), contexto(req)) }); }
export async function actualizarCargo(req: AuthRequest, res: Response) { res.json({ data: await service.actualizarCargo(req.user!.organizationId, idSchema.parse(req.params.id), actualizarCargoSchema.parse(req.body), contexto(req)) }); }
export async function desactivarCargo(req: AuthRequest, res: Response) { res.json({ data: await service.desactivarCargo(req.user!.organizationId, idSchema.parse(req.params.id), contexto(req)) }); }

export async function listarConfiguraciones(req: AuthRequest, res: Response) { res.json({ data: await service.listarConfiguraciones(req.user!.organizationId) }); }
export async function obtenerConfiguracion(req: AuthRequest, res: Response) { res.json({ data: await service.obtenerConfiguracion(req.user!.organizationId, gestionSchema(req.params.gestion)) }); }
export async function crearConfiguracion(req: AuthRequest, res: Response) { res.status(201).json({ data: await service.crearConfiguracion(configuracionSchema.parse(req.body), contexto(req)) }); }
export async function actualizarConfiguracion(req: AuthRequest, res: Response) { res.json({ data: await service.actualizarConfiguracion(req.user!.organizationId, gestionSchema(req.params.gestion), actualizarConfiguracionSchema.parse(req.body), contexto(req)) }); }
export async function desactivarConfiguracion(req: AuthRequest, res: Response) { res.json({ data: await service.desactivarConfiguracion(req.user!.organizationId, gestionSchema(req.params.gestion), contexto(req)) }); }

export async function listarFeriados(req: AuthRequest, res: Response) { const q = consultaFeriadosSchema.parse(req.query); res.json({ data: await service.listarFeriados(req.user!.organizationId, q) }); }
export async function obtenerFeriado(req: AuthRequest, res: Response) { res.json({ data: await service.obtenerFeriado(req.user!.organizationId, idSchema.parse(req.params.id)) }); }
export async function crearFeriado(req: AuthRequest, res: Response) { res.status(201).json({ data: await service.crearFeriado(feriadoSchema.parse(req.body), contexto(req)) }); }
export async function actualizarFeriado(req: AuthRequest, res: Response) { res.json({ data: await service.actualizarFeriado(req.user!.organizationId, idSchema.parse(req.params.id), actualizarFeriadoSchema.parse(req.body), contexto(req)) }); }
export async function desactivarFeriado(req: AuthRequest, res: Response) { res.json({ data: await service.desactivarFeriado(req.user!.organizationId, idSchema.parse(req.params.id), contexto(req)) }); }
export async function precargarFeriados(req: AuthRequest, res: Response) { res.status(201).json({ data: await service.precargarFeriados(req.user!.organizationId, gestionSchema(req.params.gestion), contexto(req)) }); }
export async function calcularAguinaldo(req: AuthRequest, res: Response) { const q = aguinaldoQuerySchema.parse(req.query); res.json({ data: await service.aguinaldo(req.user!.organizationId, q.gestion) }); }

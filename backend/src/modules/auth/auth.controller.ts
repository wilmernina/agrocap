import type { Request, Response } from 'express';
import { env } from '../../config/env.ts';
import type { AuthRequest } from '../../shared/types.ts';
import { loginSchema } from './auth.schemas.ts';
import { AuthService } from './auth.service.ts';

const service = new AuthService();
const opcionesCookie = { httpOnly: true, secure: env.NODE_ENV === 'production', sameSite: 'strict' as const, path: '/api/v1/auth', maxAge: env.REFRESH_TOKEN_TTL_DAYS * 86_400_000 };

export async function login(req: Request, res: Response) {
  const entrada = loginSchema.parse(req.body);
  const resultado = await service.iniciarSesion(entrada.email, entrada.password);
  res.cookie('refreshToken', resultado.refreshToken, opcionesCookie).json({ data: { accessToken: resultado.accessToken, user: resultado.usuario } });
}
export async function refresh(req: Request, res: Response) {
  const resultado = await service.renovarSesion(req.cookies?.refreshToken as string | undefined);
  res.cookie('refreshToken', resultado.refreshToken, opcionesCookie).json({ data: { accessToken: resultado.accessToken, user: resultado.usuario } });
}
export async function logout(req: Request, res: Response) {
  await service.cerrarSesion(req.cookies?.refreshToken as string | undefined);
  res.clearCookie('refreshToken', { path: '/api/v1/auth' }).status(204).send();
}
export async function me(req: AuthRequest, res: Response) {
  res.json({ data: await service.obtenerPerfil(req.user!.id, req.user!.organizationId) });
}

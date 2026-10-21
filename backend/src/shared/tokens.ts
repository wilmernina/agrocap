import crypto from 'node:crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../config/env.ts';
import type { AuthUser } from './types.ts';

const payloadAccesoSchema = z.object({
  id: z.uuid(), organizationId: z.uuid(),
  rol: z.enum(['admin', 'vendedor', 'tecnico', 'almacenero']), email: z.email(),
});
const payloadRenovacionSchema = z.object({ sub: z.uuid(), nonce: z.uuid() });

export function crearAccessToken(payload: AuthUser) {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: env.ACCESS_TOKEN_TTL } as SignOptions);
}
export function crearRefreshToken(usuarioId: string) {
  return jwt.sign({ sub: usuarioId, nonce: crypto.randomUUID() }, env.JWT_REFRESH_SECRET, { expiresIn: `${env.REFRESH_TOKEN_TTL_DAYS}d` });
}
export function verificarAccessToken(token: string): AuthUser {
  return payloadAccesoSchema.parse(jwt.verify(token, env.JWT_ACCESS_SECRET));
}
export function verificarRefreshToken(token: string) {
  return payloadRenovacionSchema.parse(jwt.verify(token, env.JWT_REFRESH_SECRET));
}
export function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}
export function fechaExpiracionRefresh() {
  return new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 86_400_000);
}

import type { NextFunction, Response } from 'express';
import { AppError } from '../shared/errors.ts';
import type { AuthRequest, AuthUser } from '../shared/types.ts';
import { verificarAccessToken } from '../shared/tokens.ts';

export function authenticate(req: AuthRequest, _res: Response, next: NextFunction) {
  const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null;
  if (!token) return next(new AppError(401, 'Autenticación requerida', 'UNAUTHORIZED'));
  try { req.user = verificarAccessToken(token); next(); }
  catch { next(new AppError(401, 'Token inválido o vencido', 'INVALID_TOKEN')); }
}

export const authorize = (...roles: AuthUser['rol'][]) => (req: AuthRequest, _res: Response, next: NextFunction) => {
  if (!req.user || !roles.includes(req.user.rol)) return next(new AppError(403, 'No tiene permisos para esta acción', 'FORBIDDEN'));
  next();
};

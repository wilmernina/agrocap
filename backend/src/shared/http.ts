import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from './errors.ts';

export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => { void fn(req, res, next).catch(next); };

export function notFound(_req: Request, res: Response) { res.status(404).json({ error: { code: 'ROUTE_NOT_FOUND', message: 'Ruta no encontrada' } }); }

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if ((error as { name?: string }).name === 'MulterError') {
    const codigo = (error as { code?: string }).code;
    return res.status(codigo === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ error: { code: codigo ?? 'UPLOAD_INVALIDO', message: codigo === 'LIMIT_FILE_SIZE' ? 'La foto supera el límite de 12 MB' : 'No se pudo recibir el archivo adjunto' } });
  }
  if (error instanceof ZodError) return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'Datos inválidos', details: error.issues } });
  if (error instanceof AppError) return res.status(error.status).json({ error: { code: error.code, message: error.message, details: error.details } });
  const errorDb = error as { code?: string; message?: string };
  if (errorDb.code === '23514' && errorDb.message?.includes('No hay lote disponible y vigente suficiente')) {
    return res.status(409).json({ error: { code: 'LOTE_NO_DISPONIBLE', message: 'El inventario general tiene saldo, pero no hay cantidad en un lote vigente. Registra el lote físico del producto desde Inventario → Lotes y alertas.' } });
  }
  console.error(error);
  return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor' } });
}

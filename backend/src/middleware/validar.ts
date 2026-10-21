import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';

type EsquemasPeticion = {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
};

/** Valida y normaliza las partes configuradas de una petición antes del controlador. */
export function validar(esquemas: EsquemasPeticion) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (esquemas.body) req.body = esquemas.body.parse(req.body);
    if (esquemas.query) Object.assign(req.query, esquemas.query.parse(req.query));
    if (esquemas.params) Object.assign(req.params, esquemas.params.parse(req.params));
    next();
  };
}

export class AppError extends Error {
  constructor(public status: number, message: string, public code = 'APP_ERROR', public details?: unknown) { super(message); }
}

export class NotFoundError extends AppError {
  constructor(resource: string) { super(404, `${resource} no encontrado`, 'NOT_FOUND'); }
}

export class ConflictError extends AppError {
  constructor(message: string) { super(409, message, 'CONFLICT'); }
}

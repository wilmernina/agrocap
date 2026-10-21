import type { Request } from 'express';
export type RolUsuario = 'admin' | 'vendedor' | 'tecnico' | 'almacenero';
export type AuthUser = { id: string; organizationId: string; rol: RolUsuario; email: string };
export type AuthRequest = Request & { user?: AuthUser };

import { env } from '../config/env';
import { useAuth } from '../store/auth';
import type { User } from '../types';

type ErrorBackend = { error?: { code?: string; message?: string; details?: unknown } };
type RespuestaSesion = { data: { accessToken: string; user: User } };

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code = 'API_ERROR',
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

let renovacionActiva: Promise<string | null> | null = null;

async function leerError(response: Response) {
  const body = await response.json().catch(() => null) as ErrorBackend | null;
  return new ApiError(
    body?.error?.message ?? `No se pudo completar la operación (${response.status})`,
    response.status,
    body?.error?.code,
    body?.error?.details,
  );
}

async function solicitar(path: string, init: RequestInit) {
  try {
    return await fetch(`${env.VITE_API_URL}${path}`, init);
  } catch {
    throw new ApiError(
      'No se pudo conectar con AgroCAP. Verifica que el backend esté ejecutándose en el puerto 4000.',
      0,
      'SIN_CONEXION',
    );
  }
}

export async function renovarSesion() {
  if (!renovacionActiva) {
    renovacionActiva = solicitar('/auth/refresh', { method: 'POST', credentials: 'include' })
      .then(async (response) => {
        if (!response.ok) return null;
        const body = await response.json() as RespuestaSesion;
        useAuth.getState().setSession(body.data.user, body.data.accessToken);
        return body.data.accessToken;
      })
      .catch(() => null)
      .finally(() => { renovacionActiva = null; });
  }
  return renovacionActiva;
}

export async function api<T>(path: string, init: RequestInit = {}, reintentar = true): Promise<T> {
  const token = useAuth.getState().accessToken;
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await solicitar(path, { ...init, headers, credentials: 'include' });
  if (response.status === 401 && reintentar && !path.startsWith('/auth/')) {
    const tokenRenovado = await renovarSesion();
    if (tokenRenovado) return api<T>(path, init, false);
    useAuth.getState().clearSession();
  }
  if (!response.ok) throw await leerError(response);
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function inicializarSesion() {
  try {
    const token = await renovarSesion();
    if (!token && typeof navigator !== 'undefined' && !navigator.onLine) {
      try {
        const texto = localStorage.getItem('agrosys-ultima-cuenta');
        if (texto) {
          const usuario = JSON.parse(texto) as Partial<User>;
          if (typeof usuario.id === 'string' && typeof usuario.name === 'string' && typeof usuario.role === 'string' && typeof usuario.organizationId === 'string') {
            useAuth.getState().restoreOfflineSession(usuario as User);
          }
        }
      } catch { /* Sin identidad local válida se requiere iniciar sesión en línea. */ }
    }
  } finally {
    useAuth.getState().finishInitialization();
  }
}

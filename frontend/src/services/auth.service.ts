import { api } from '../lib/api';
import type { User } from '../types';

export type Credenciales = { email: string; password: string };
type RespuestaAuth = { data: { accessToken: string; user: User } };

export const authService = {
  login: (credenciales: Credenciales) => api<RespuestaAuth>('/auth/login', {
    method: 'POST', body: JSON.stringify(credenciales),
  }),
  logout: () => api<void>('/auth/logout', { method: 'POST' }),
  perfil: () => api<{ data: User }>('/auth/me'),
};

import { beforeEach, describe, expect, it } from 'vitest';
import { useAuth } from './auth';

const usuario = {
  id: '123e4567-e89b-42d3-a456-426614174000',
  name: 'Administrador',
  email: 'admin@agrocap.bo',
  role: 'admin',
  organizationId: '123e4567-e89b-42d3-a456-426614174001',
};

describe('estado de autenticación', () => {
  beforeEach(() => useAuth.setState({ user: null, accessToken: null, initialized: false }));

  it('registra una sesión únicamente en memoria', () => {
    useAuth.getState().setSession(usuario, 'access-token');
    expect(useAuth.getState()).toMatchObject({ user: usuario, accessToken: 'access-token', initialized: true });
  });

  it('elimina la identidad y el token al cerrar sesión', () => {
    useAuth.getState().setSession(usuario, 'access-token');
    useAuth.getState().clearSession();
    expect(useAuth.getState()).toMatchObject({ user: null, accessToken: null, initialized: true });
  });
});

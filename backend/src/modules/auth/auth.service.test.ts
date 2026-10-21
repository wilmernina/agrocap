import test from 'node:test';
import assert from 'node:assert/strict';
import { AuthService } from './auth.service.ts';
import type { AuthRepository } from './auth.repository.ts';
import { generarPasswordHash } from '../../shared/password.ts';
import { AppError } from '../../shared/errors.ts';

const usuarioId = '123e4567-e89b-42d3-a456-426614174000';
const organizacionId = '123e4567-e89b-42d3-a456-426614174001';

test('login entrega tokens y guarda únicamente el hash del refresh token', async () => {
  let tokenHashGuardado = '';
  const usuario = {
    id: usuarioId,
    organizacionId,
    nombre: 'Administrador',
    email: 'admin@agrocap.bo',
    passwordHash: await generarPasswordHash('AgroSys2026!'),
    rol: 'admin' as const,
    activo: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const repository = {
    buscarUsuarioPorEmail: async () => usuario,
    guardarToken: async (_usuarioId: string, tokenHash: string) => {
      tokenHashGuardado = tokenHash;
      return { id: 'token-id' };
    },
  } as unknown as AuthRepository;

  const resultado = await new AuthService(repository).iniciarSesion(usuario.email, 'AgroSys2026!');
  assert.ok(resultado.accessToken.length > 20);
  assert.ok(resultado.refreshToken.length > 20);
  assert.match(tokenHashGuardado, /^[a-f0-9]{64}$/);
  assert.notEqual(tokenHashGuardado, resultado.refreshToken);
  assert.equal(resultado.usuario.rol, 'admin');
});

test('login rechaza una contraseña incorrecta sin crear sesión', async () => {
  const repository = {
    buscarUsuarioPorEmail: async () => ({
      id: usuarioId, organizacionId, nombre: 'Administrador AgroCAP', email: 'admin@agrocap.bo',
      passwordHash: await generarPasswordHash('AgroSys2026!'), rol: 'admin' as const,
    }),
    guardarToken: async () => { throw new Error('No debe guardar un token'); },
  } as unknown as AuthRepository;

  await assert.rejects(
    () => new AuthService(repository).iniciarSesion('admin@agrocap.bo', 'incorrecta'),
    (error: unknown) => error instanceof AppError && error.status === 401 && error.code === 'CREDENCIALES_INVALIDAS',
  );
});

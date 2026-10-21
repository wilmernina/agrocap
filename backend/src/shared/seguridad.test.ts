import test from 'node:test';
import assert from 'node:assert/strict';
import { generarPasswordHash, verificarPassword } from './password.ts';
import { crearAccessToken, crearRefreshToken, hashToken, verificarAccessToken, verificarRefreshToken } from './tokens.ts';

const usuario = {
  id: '123e4567-e89b-42d3-a456-426614174000',
  organizationId: '123e4567-e89b-42d3-a456-426614174001',
  rol: 'admin' as const,
  email: 'admin@agrocap.bo',
};

test('bcrypt genera un hash y valida únicamente la contraseña correcta', async () => {
  const hash = await generarPasswordHash('AgroSys2026!');
  assert.notEqual(hash, 'AgroSys2026!');
  assert.equal(await verificarPassword('AgroSys2026!', hash), true);
  assert.equal(await verificarPassword('Incorrecta2026!', hash), false);
});

test('access token conserva una identidad validada', () => {
  const token = crearAccessToken(usuario);
  assert.deepEqual(verificarAccessToken(token), usuario);
  assert.throws(() => verificarAccessToken(`${token}alterado`));
});

test('refresh token incluye usuario y se almacena mediante hash irreversible', () => {
  const token = crearRefreshToken(usuario.id);
  assert.equal(verificarRefreshToken(token).sub, usuario.id);
  assert.match(hashToken(token), /^[a-f0-9]{64}$/);
  assert.notEqual(hashToken(token), token);
});

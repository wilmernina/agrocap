import bcrypt from 'bcrypt';

const RONDAS_BCRYPT = 12;

export function generarPasswordHash(password: string) {
  return bcrypt.hash(password, RONDAS_BCRYPT);
}

export function verificarPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

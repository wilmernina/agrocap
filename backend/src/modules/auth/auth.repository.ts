import { and, eq, gt, isNull } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import { organizaciones, tokensRenovacion, usuarios } from '../../db/schema-fase1.ts';

export class AuthRepository {
  async buscarUsuarioPorEmail(email: string) {
    const [usuario] = await db.select().from(usuarios)
      .where(and(eq(usuarios.email, email), eq(usuarios.activo, true))).limit(1);
    return usuario;
  }

  async buscarUsuarioPorId(id: string, organizacionId?: string) {
    const [usuario] = await db.select({
      id: usuarios.id, organizacionId: usuarios.organizacionId, nombre: usuarios.nombre,
      email: usuarios.email, rol: usuarios.rol, activo: usuarios.activo,
      organizacion: organizaciones.nombre, moneda: organizaciones.moneda,
    }).from(usuarios)
      .innerJoin(organizaciones, eq(usuarios.organizacionId, organizaciones.id))
      .where(and(
        eq(usuarios.id, id), organizacionId ? eq(usuarios.organizacionId, organizacionId) : undefined,
        eq(usuarios.activo, true), eq(organizaciones.activo, true),
      )).limit(1);
    return usuario;
  }

  async guardarToken(usuarioId: string, tokenHash: string, expiraEn: Date) {
    const [token] = await db.insert(tokensRenovacion).values({ usuarioId, tokenHash, expiraEn }).returning();
    return token;
  }

  async buscarTokenVigente(tokenHash: string) {
    const [token] = await db.select().from(tokensRenovacion).where(and(
      eq(tokensRenovacion.tokenHash, tokenHash), isNull(tokensRenovacion.revocadoEn),
      gt(tokensRenovacion.expiraEn, new Date()),
    )).limit(1);
    return token;
  }

  async revocarToken(tokenHash: string) {
    await db.update(tokensRenovacion).set({ revocadoEn: new Date() }).where(and(
      eq(tokensRenovacion.tokenHash, tokenHash), isNull(tokensRenovacion.revocadoEn),
    ));
  }

  async rotarToken(tokenAnteriorHash: string, usuarioId: string, tokenNuevoHash: string, expiraEn: Date) {
    return db.transaction(async (tx) => {
      const [revocado] = await tx.update(tokensRenovacion).set({ revocadoEn: new Date() }).where(and(
        eq(tokensRenovacion.tokenHash, tokenAnteriorHash), eq(tokensRenovacion.usuarioId, usuarioId),
        isNull(tokensRenovacion.revocadoEn), gt(tokensRenovacion.expiraEn, new Date()),
      )).returning({ id: tokensRenovacion.id });
      if (!revocado) return false;
      await tx.insert(tokensRenovacion).values({ usuarioId, tokenHash: tokenNuevoHash, expiraEn });
      return true;
    });
  }
}

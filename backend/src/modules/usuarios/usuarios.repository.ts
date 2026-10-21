import { and, asc, count, eq, ilike, or } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import { auditoria, usuarios } from '../../db/schema-fase1.ts';
import type { RolUsuario } from '../../shared/types.ts';

type UsuarioPersistencia = { nombre: string; email: string; passwordHash: string; rol: RolUsuario; activo: boolean };
type ContextoAuditoria = { actorId: string; ip?: string };

const camposPublicos = {
  id: usuarios.id, organizacionId: usuarios.organizacionId, nombre: usuarios.nombre,
  email: usuarios.email, rol: usuarios.rol, activo: usuarios.activo,
  createdAt: usuarios.createdAt, updatedAt: usuarios.updatedAt,
};

export class UsuariosRepository {
  async listar(organizacionId: string, pagina: number, limite: number, busqueda: string) {
    const filtro = and(
      eq(usuarios.organizacionId, organizacionId),
      busqueda ? or(ilike(usuarios.nombre, `%${busqueda}%`), ilike(usuarios.email, `%${busqueda}%`)) : undefined,
    );
    const [data, total] = await Promise.all([
      db.select(camposPublicos).from(usuarios).where(filtro).orderBy(asc(usuarios.nombre)).limit(limite).offset((pagina - 1) * limite),
      db.select({ valor: count() }).from(usuarios).where(filtro),
    ]);
    return { data, total: total[0]?.valor ?? 0 };
  }

  async buscarPorId(organizacionId: string, id: string) {
    const [usuario] = await db.select(camposPublicos).from(usuarios)
      .where(and(eq(usuarios.id, id), eq(usuarios.organizacionId, organizacionId))).limit(1);
    return usuario;
  }

  async crear(organizacionId: string, datos: UsuarioPersistencia, contexto: ContextoAuditoria) {
    return db.transaction(async (tx) => {
      const [usuario] = await tx.insert(usuarios).values({ organizacionId, ...datos }).returning(camposPublicos);
      await tx.insert(auditoria).values({
        organizacionId, usuarioId: contexto.actorId, accion: 'CREAR', tablaAfectada: 'usuarios',
        registroId: usuario.id, datosNuevos: usuario, ip: contexto.ip,
      });
      return usuario;
    });
  }

  async actualizar(organizacionId: string, id: string, cambios: Partial<UsuarioPersistencia>, contexto: ContextoAuditoria) {
    return db.transaction(async (tx) => {
      const [anterior] = await tx.select(camposPublicos).from(usuarios)
        .where(and(eq(usuarios.id, id), eq(usuarios.organizacionId, organizacionId))).for('update');
      if (!anterior) return undefined;
      const [usuario] = await tx.update(usuarios).set({ ...cambios, updatedAt: new Date() })
        .where(and(eq(usuarios.id, id), eq(usuarios.organizacionId, organizacionId))).returning(camposPublicos);
      await tx.insert(auditoria).values({
        organizacionId, usuarioId: contexto.actorId, accion: 'ACTUALIZAR', tablaAfectada: 'usuarios',
        registroId: id, datosAnteriores: anterior, datosNuevos: usuario, ip: contexto.ip,
      });
      return usuario;
    });
  }

  async desactivar(organizacionId: string, id: string, contexto: ContextoAuditoria) {
    return this.actualizar(organizacionId, id, { activo: false }, contexto);
  }
}

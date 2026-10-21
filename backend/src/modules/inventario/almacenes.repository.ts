import { and, asc, eq, sql } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import { almacenes, existenciasAlmacen } from '../../db/schema-fase1.ts';
import { registrarAuditoria, type ContextoAuditoria } from '../../shared/auditoria.ts';
import type { ActualizarAlmacenInput, AlmacenInput } from './almacenes.schemas.ts';

export class AlmacenesRepository {
  listar(organizacionId: string) {
    return db.select().from(almacenes).where(eq(almacenes.organizacionId, organizacionId)).orderBy(asc(almacenes.nombre));
  }

  crear(datos: AlmacenInput, contexto: ContextoAuditoria) {
    return db.transaction(async (tx) => {
      const [fila] = await tx.insert(almacenes).values({ ...datos, organizacionId: contexto.organizacionId }).returning();
      await registrarAuditoria(tx, contexto, 'CREAR', 'almacenes', fila.id, null, fila);
      return fila;
    });
  }

  actualizar(id: string, datos: ActualizarAlmacenInput, contexto: ContextoAuditoria) {
    return db.transaction(async (tx) => {
      const [anterior] = await tx.select().from(almacenes).where(and(eq(almacenes.id, id), eq(almacenes.organizacionId, contexto.organizacionId))).for('update');
      if (!anterior) return undefined;
      const [fila] = await tx.update(almacenes).set({ ...datos, updatedAt: new Date() }).where(eq(almacenes.id, id)).returning();
      await registrarAuditoria(tx, contexto, 'ACTUALIZAR', 'almacenes', id, anterior, fila);
      return fila;
    });
  }

  desactivar(id: string, contexto: ContextoAuditoria) {
    return db.transaction(async (tx) => {
      const [anterior] = await tx.select().from(almacenes).where(and(eq(almacenes.id, id), eq(almacenes.organizacionId, contexto.organizacionId))).for('update');
      if (!anterior) return undefined;
      const [stock] = await tx.select({ id: existenciasAlmacen.almacenId })
        .from(existenciasAlmacen).where(and(eq(existenciasAlmacen.organizacionId, contexto.organizacionId), eq(existenciasAlmacen.almacenId, id), sql`${existenciasAlmacen.cantidad} <> 0`)).limit(1);
      if (stock) return { conStock: true } as const;
      const [fila] = await tx.update(almacenes).set({ activo: false, updatedAt: new Date() }).where(eq(almacenes.id, id)).returning();
      await registrarAuditoria(tx, contexto, 'DESACTIVAR', 'almacenes', id, anterior, fila);
      return fila;
    });
  }
}

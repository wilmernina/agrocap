import { auditoria } from '../db/schema-fase1.ts';
import { db } from '../db/index.ts';

export type ContextoAuditoria = {
  organizacionId: string;
  usuarioId: string;
  ip?: string;
};

export type TransaccionDB = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function registrarAuditoria(
  tx: TransaccionDB,
  contexto: ContextoAuditoria,
  accion: 'CREAR' | 'ACTUALIZAR' | 'DESACTIVAR',
  tablaAfectada: string,
  registroId: string,
  datosAnteriores: unknown,
  datosNuevos: unknown,
) {
  await tx.insert(auditoria).values({
    organizacionId: contexto.organizacionId,
    usuarioId: contexto.usuarioId,
    accion,
    tablaAfectada,
    registroId,
    datosAnteriores,
    datosNuevos,
    ip: contexto.ip,
  });
}

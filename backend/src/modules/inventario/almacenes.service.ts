import { ConflictError, NotFoundError } from '../../shared/errors.ts';
import type { ContextoAuditoria } from '../../shared/auditoria.ts';
import type { ActualizarAlmacenInput, AlmacenInput } from './almacenes.schemas.ts';
import { AlmacenesRepository } from './almacenes.repository.ts';

export class AlmacenesService {
  constructor(private readonly repository = new AlmacenesRepository()) {}
  listar(organizacionId: string) { return this.repository.listar(organizacionId); }
  async crear(datos: AlmacenInput, contexto: ContextoAuditoria) {
    try { return await this.repository.crear(datos, contexto); }
    catch (error) { if ((error as { code?: string }).code === '23505') throw new ConflictError('Ya existe un almacén con ese código'); throw error; }
  }
  async actualizar(id: string, datos: ActualizarAlmacenInput, contexto: ContextoAuditoria) {
    try { const fila = await this.repository.actualizar(id, datos, contexto); if (!fila) throw new NotFoundError('Almacén'); return fila; }
    catch (error) { if ((error as { code?: string }).code === '23505') throw new ConflictError('Ya existe un almacén con ese código'); throw error; }
  }
  async desactivar(id: string, contexto: ContextoAuditoria) {
    const fila = await this.repository.desactivar(id, contexto);
    if (!fila) throw new NotFoundError('Almacén');
    if ('conStock' in fila) throw new ConflictError('Traslada las existencias antes de desactivar este almacén');
    return fila;
  }
}

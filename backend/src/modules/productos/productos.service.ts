import type { ContextoAuditoria } from '../../shared/auditoria.ts';
import { ConflictError, NotFoundError } from '../../shared/errors.ts';
import type { ActualizarProductoInput, ConsultaProductos, CrearProductoInput } from './productos.schemas.ts';
import { ProductosRepository } from './productos.repository.ts';

export class ProductosService {
  constructor(private readonly repository = new ProductosRepository()) {}
  listar(org: string, consulta: ConsultaProductos) { return this.repository.listar(org, consulta); }
  alertasStock(org: string) { return this.repository.alertasStock(org); }
  async obtener(org: string, id: string) { const fila = await this.repository.obtener(org, id); if (!fila) throw new NotFoundError('Producto'); return fila; }
  async crear(datos: CrearProductoInput, contexto: ContextoAuditoria) { try { return await this.repository.crear(datos, contexto); } catch (error) { return this.traducirConflicto(error); } }
  async actualizar(id: string, datos: ActualizarProductoInput, contexto: ContextoAuditoria) { try { const fila = await this.repository.actualizar(id, datos, contexto); if (!fila) throw new NotFoundError('Producto'); return fila; } catch (error) { return this.traducirConflicto(error); } }
  async desactivar(id: string, contexto: ContextoAuditoria) { const fila = await this.repository.desactivar(id, contexto); if (!fila) throw new NotFoundError('Producto'); return fila; }
  private traducirConflicto(error: unknown): never { if ((error as { code?: string }).code === '23505') throw new ConflictError('El SKU o código de barras ya está registrado'); throw error; }
}

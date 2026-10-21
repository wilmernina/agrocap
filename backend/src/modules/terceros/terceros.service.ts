import type { ContextoAuditoria } from '../../shared/auditoria.ts';
import { ConflictError, NotFoundError } from '../../shared/errors.ts';
import type { ActualizarClienteInput, ActualizarProveedorInput, ClienteInput, ProveedorInput } from './terceros.schemas.ts';
import { TercerosRepository } from './terceros.repository.ts';

export class TercerosService {
  constructor(private readonly repository = new TercerosRepository()) {}
  listarClientes(org: string, p: number, l: number, b: string, a?: boolean) { return this.repository.listarClientes(org, p, l, b, a); }
  async obtenerCliente(org: string, id: string) { const fila = await this.repository.obtenerCliente(org, id); if (!fila) throw new NotFoundError('Cliente'); return fila; }
  async crearCliente(datos: ClienteInput, ctx: ContextoAuditoria) { try { return await this.repository.crearCliente(datos, ctx); } catch (e) { return this.conflicto(e, 'El NIT/CI ya está registrado'); } }
  async actualizarCliente(id: string, datos: ActualizarClienteInput, ctx: ContextoAuditoria) { try { const fila = await this.repository.actualizarCliente(id, datos, ctx); if (!fila) throw new NotFoundError('Cliente'); return fila; } catch (e) { return this.conflicto(e, 'El NIT/CI ya está registrado'); } }
  async desactivarCliente(id: string, ctx: ContextoAuditoria) { const fila = await this.repository.desactivarCliente(id, ctx); if (!fila) throw new NotFoundError('Cliente'); return fila; }
  listarProveedores(org: string, p: number, l: number, b: string, a?: boolean) { return this.repository.listarProveedores(org, p, l, b, a); }
  async obtenerProveedor(org: string, id: string) { const fila = await this.repository.obtenerProveedor(org, id); if (!fila) throw new NotFoundError('Proveedor'); return fila; }
  async crearProveedor(datos: ProveedorInput, ctx: ContextoAuditoria) { try { return await this.repository.crearProveedor(datos, ctx); } catch (e) { return this.conflicto(e, 'El NIT ya está registrado'); } }
  async actualizarProveedor(id: string, datos: ActualizarProveedorInput, ctx: ContextoAuditoria) { try { const fila = await this.repository.actualizarProveedor(id, datos, ctx); if (!fila) throw new NotFoundError('Proveedor'); return fila; } catch (e) { return this.conflicto(e, 'El NIT ya está registrado'); } }
  async desactivarProveedor(id: string, ctx: ContextoAuditoria) { const fila = await this.repository.desactivarProveedor(id, ctx); if (!fila) throw new NotFoundError('Proveedor'); return fila; }
  private conflicto(error: unknown, mensaje: string): never { if ((error as { code?: string }).code === '23505') throw new ConflictError(mensaje); throw error; }
}

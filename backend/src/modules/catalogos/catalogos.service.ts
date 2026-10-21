import { ConflictError, NotFoundError } from '../../shared/errors.ts';
import type { ContextoAuditoria } from '../../shared/auditoria.ts';
import type { ActualizarCategoriaInput, ActualizarUnidadInput, CategoriaInput, UnidadInput } from './catalogos.schemas.ts';
import { CatalogosRepository } from './catalogos.repository.ts';

export class CatalogosService {
  constructor(private readonly repository = new CatalogosRepository()) {}
  listarCategorias(org: string, pagina: number, limite: number, busqueda: string, activo?: boolean) { return this.repository.listarCategorias(org, pagina, limite, busqueda, activo); }
  async obtenerCategoria(org: string, id: string) { const fila = await this.repository.obtenerCategoria(org, id); if (!fila) throw new NotFoundError('Categoría'); return fila; }
  async crearCategoria(datos: CategoriaInput, contexto: ContextoAuditoria) { try { return await this.repository.crearCategoria(datos, contexto); } catch (error) { this.conflicto(error, 'Ya existe una categoría con ese nombre'); } }
  async actualizarCategoria(id: string, datos: ActualizarCategoriaInput, contexto: ContextoAuditoria) { try { const fila = await this.repository.actualizarCategoria(id, datos, contexto); if (!fila) throw new NotFoundError('Categoría'); return fila; } catch (error) { this.conflicto(error, 'Ya existe una categoría con ese nombre'); } }
  async desactivarCategoria(id: string, contexto: ContextoAuditoria) { const fila = await this.repository.desactivarCategoria(id, contexto); if (!fila) throw new NotFoundError('Categoría'); return fila; }
  listarUnidades(org: string, pagina: number, limite: number, busqueda: string, activo?: boolean) { return this.repository.listarUnidades(org, pagina, limite, busqueda, activo); }
  async obtenerUnidad(org: string, id: string) { const fila = await this.repository.obtenerUnidad(org, id); if (!fila) throw new NotFoundError('Unidad de medida'); return fila; }
  async crearUnidad(datos: UnidadInput, contexto: ContextoAuditoria) { try { return await this.repository.crearUnidad(datos, contexto); } catch (error) { this.conflicto(error, 'Ya existe una unidad con esa abreviatura'); } }
  async actualizarUnidad(id: string, datos: ActualizarUnidadInput, contexto: ContextoAuditoria) { try { const fila = await this.repository.actualizarUnidad(id, datos, contexto); if (!fila) throw new NotFoundError('Unidad de medida'); return fila; } catch (error) { this.conflicto(error, 'Ya existe una unidad con esa abreviatura'); } }
  async desactivarUnidad(id: string, contexto: ContextoAuditoria) { const fila = await this.repository.desactivarUnidad(id, contexto); if (!fila) throw new NotFoundError('Unidad de medida'); return fila; }
  private conflicto(error: unknown, mensaje: string): never { if ((error as { code?: string }).code === '23505') throw new ConflictError(mensaje); throw error; }
}

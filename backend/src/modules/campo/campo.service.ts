import { AppError, ConflictError, NotFoundError } from '../../shared/errors.ts';
import type { ContextoAuditoria } from '../../shared/auditoria.ts';
import type {
  ActualizarFincaInput, ActualizarLoteParcelaInput, ActualizarParcelaInput, ActualizarPuntoInteresInput,
  ConsultaFincas, ConsultaGeoJson, ConsultaParcelas, FincaInput, LoteParcelaInput, ParcelaInput, PuntoInteresInput,
} from './campo.schemas.ts';
import { CampoRepository } from './campo.repository.ts';

export class CampoService {
  constructor(private readonly repo = new CampoRepository()) {}

  listarFincas(org: string, q: ConsultaFincas) { return this.repo.listarFincas(org, q); }
  async obtenerFinca(org: string, id: string) { const fila = await this.repo.obtenerFinca(org, id); if (!fila) throw new NotFoundError('Finca'); return fila; }
  crearFinca(datos: FincaInput, ctx: ContextoAuditoria) { return this.conErrores(() => this.repo.crearFinca(datos, ctx)); }
  async actualizarFinca(id: string, datos: ActualizarFincaInput, ctx: ContextoAuditoria) { return this.asegurar(await this.conErrores(() => this.repo.actualizarFinca(id, datos, ctx)), 'Finca'); }
  async desactivarFinca(id: string, ctx: ContextoAuditoria) { return this.asegurar(await this.repo.desactivarFinca(id, ctx), 'Finca'); }
  async parcelasFinca(org: string, id: string) { await this.obtenerFinca(org, id); return this.repo.parcelasFinca(org, id); }

  listarParcelas(org: string, q: ConsultaParcelas) { return this.repo.listarParcelas(org, q); }
  obtenerParcela(org: string, id: string) { return this.repo.obtenerParcela(org, id).then((fila) => this.asegurar(fila, 'Parcela')); }
  geojsonParcelas(org: string, q: ConsultaGeoJson) { return this.repo.geojsonParcelas(org, q); }
  async crearParcela(datos: ParcelaInput, ctx: ContextoAuditoria) {
    const fila = await this.conErrores(() => this.repo.crearParcela(datos, ctx));
    if (!fila) throw new NotFoundError('Finca'); return fila;
  }
  async actualizarParcela(id: string, datos: ActualizarParcelaInput, ctx: ContextoAuditoria) {
    const fila = await this.conErrores(() => this.repo.actualizarParcela(id, datos, ctx));
    if (fila === 'FINCA_INVALIDA') throw new AppError(422, 'La finca no existe en esta organización', 'FINCA_INVALIDA');
    return this.asegurar(fila, 'Parcela');
  }
  async desactivarParcela(id: string, ctx: ContextoAuditoria) { return this.asegurar(await this.repo.desactivarParcela(id, ctx), 'Parcela'); }

  listarLotes(org: string, parcelaId?: string) { return this.repo.crudLote('listar', parcelaId, undefined, { organizacionId: org, usuarioId: '' }); }
  geojsonLotes(org: string, parcelaId?: string) { return this.repo.crudLote('geojson', parcelaId, undefined, { organizacionId: org, usuarioId: '' }); }
  async obtenerLote(org: string, id: string) { return this.asegurar(await this.repo.crudLote('obtener', id, undefined, { organizacionId: org, usuarioId: '' }), 'Lote'); }
  async crearLote(datos: LoteParcelaInput, ctx: ContextoAuditoria) { return this.asegurar(await this.conErrores(() => this.repo.crudLote('crear', undefined, datos, ctx)), 'Parcela'); }
  async actualizarLote(id: string, datos: ActualizarLoteParcelaInput, ctx: ContextoAuditoria) { return this.asegurar(await this.conErrores(() => this.repo.crudLote('actualizar', id, datos, ctx)), 'Lote'); }
  async desactivarLote(id: string, ctx: ContextoAuditoria) { return this.asegurar(await this.repo.crudLote('desactivar', id, undefined, ctx), 'Lote'); }

  listarPuntos(org: string, fincaId?: string) { return this.repo.crudPunto('listar', fincaId, undefined, { organizacionId: org, usuarioId: '' }); }
  geojsonPuntos(org: string, fincaId?: string) { return this.repo.crudPunto('geojson', fincaId, undefined, { organizacionId: org, usuarioId: '' }); }
  async obtenerPunto(org: string, id: string) { return this.asegurar(await this.repo.crudPunto('obtener', id, undefined, { organizacionId: org, usuarioId: '' }), 'Punto de interés'); }
  async crearPunto(datos: PuntoInteresInput, ctx: ContextoAuditoria) { return this.asegurar(await this.conErrores(() => this.repo.crudPunto('crear', undefined, datos, ctx)), 'Finca o parcela'); }
  async actualizarPunto(id: string, datos: ActualizarPuntoInteresInput, ctx: ContextoAuditoria) {
    const fila = await this.conErrores(() => this.repo.crudPunto('actualizar', id, datos, ctx));
    if (fila === 'PARCELA_INVALIDA') throw new AppError(422, 'La parcela debe pertenecer a la finca del punto de interés', 'PARCELA_INVALIDA');
    return this.asegurar(fila, 'Punto de interés');
  }
  async eliminarPunto(id: string, ctx: ContextoAuditoria) { return this.asegurar(await this.repo.crudPunto('desactivar', id, undefined, ctx), 'Punto de interés'); }

  private asegurar<T>(fila: T | undefined, recurso: string): T { if (!fila) throw new NotFoundError(recurso); return fila; }
  private async conErrores<T>(operacion: () => Promise<T>): Promise<T> {
    try { return await operacion(); }
    catch (error) {
      const code = (error as { code?: string }).code;
      if (code === '23505') throw new ConflictError('Ya existe un registro con ese código o nombre');
      if (code === '22023') throw new AppError(422, (error as Error).message.replace(/^.*?: /, ''), 'GEOMETRIA_INVALIDA');
      if (code === '23503') throw new AppError(422, 'La referencia indicada no existe o no pertenece a esta organización', 'REFERENCIA_INVALIDA');
      throw error;
    }
  }
}

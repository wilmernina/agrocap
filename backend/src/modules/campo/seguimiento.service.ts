import { AppError, ConflictError, NotFoundError } from '../../shared/errors.ts';
import type { ContextoAuditoria } from '../../shared/auditoria.ts';
import { SeguimientoRepository } from './seguimiento.repository.ts';
import { AlmacenamientoLocalFotos, type AlmacenamientoFotos } from './foto-storage.ts';
import type {
  ActualizarActividadInput, ActualizarCicloInput, ActualizarCultivoInput, ActualizarMonitoreoInput,
  ActividadInput, CicloInput, ConsultaActividades, ConsultaCiclos, ConsultaCultivos, ConsultaFotos,
  ConsultaMonitoreo, CultivoInput, FotoCampoInput, MonitoreoInput,
} from './seguimiento.schemas.ts';

export class SeguimientoService {
  constructor(private readonly repo = new SeguimientoRepository(), private readonly almacenamiento: AlmacenamientoFotos = new AlmacenamientoLocalFotos()) {}

  listarCultivos(org: string, q: ConsultaCultivos) { return this.repo.listarCultivos(org, q); }
  async obtenerCultivo(org: string, id: string) { return this.existe(await this.repo.obtenerCultivo(org, id), 'Cultivo'); }
  crearCultivo(d: CultivoInput, ctx: ContextoAuditoria) { return this.conErrores(() => this.repo.crearCultivo(d, ctx)); }
  async actualizarCultivo(id: string, d: ActualizarCultivoInput, ctx: ContextoAuditoria) { return this.existe(await this.conErrores(() => this.repo.actualizarCultivo(id, d, ctx)), 'Cultivo'); }
  async desactivarCultivo(id: string, ctx: ContextoAuditoria) { return this.existe(await this.repo.desactivarCultivo(id, ctx), 'Cultivo'); }
  async ciclosDeCultivo(org: string, id: string) { await this.obtenerCultivo(org, id); return this.repo.ciclosDeCultivo(org, id); }

  listarCiclos(org: string, q: ConsultaCiclos) { return this.repo.listarCiclos(org, q); }
  ciclosActivos(org: string) { return this.repo.ciclosActivos(org); }
  async obtenerCiclo(org: string, id: string) { return this.existe(await this.repo.obtenerCiclo(org, id), 'Ciclo de cultivo'); }
  crearCiclo(d: CicloInput, ctx: ContextoAuditoria) { return this.conErrores(() => this.repo.crearCiclo(d, ctx)); }
  async actualizarCiclo(id: string, d: ActualizarCicloInput, ctx: ContextoAuditoria) { return this.existe(await this.conErrores(() => this.repo.actualizarCiclo(id, d, ctx)), 'Ciclo de cultivo'); }
  async desactivarCiclo(id: string, ctx: ContextoAuditoria) { return this.existe(await this.repo.desactivarCiclo(id, ctx), 'Ciclo de cultivo'); }
  async cosecharCiclo(id: string, rendimiento: number, fecha: string | undefined, observaciones: string | null | undefined, ctx: ContextoAuditoria) { return this.existe(await this.repo.cosecharCiclo(id, rendimiento, fecha, observaciones, ctx), 'Ciclo de cultivo'); }

  listarActividades(org: string, q: ConsultaActividades) { return this.repo.listarActividades(org, q); }
  async obtenerActividad(org: string, id: string) { return this.existe(await this.repo.obtenerActividad(org, id), 'Actividad de campo'); }
  crearActividad(d: ActividadInput, ctx: ContextoAuditoria) { return this.conErrores(() => this.repo.crearActividad(d, ctx)); }
  async actualizarActividad(id: string, d: ActualizarActividadInput, ctx: ContextoAuditoria) { return this.existe(await this.conErrores(() => this.repo.actualizarActividad(id, d, ctx)), 'Actividad de campo'); }
  async eliminarActividad(id: string, ctx: ContextoAuditoria) { return this.existe(await this.repo.eliminarActividad(id, ctx), 'Actividad de campo'); }

  listarMonitoreo(org: string, q: ConsultaMonitoreo) { return this.repo.listarMonitoreo(org, q); }
  alertasMonitoreo(org: string, q: ConsultaMonitoreo) { return this.repo.listarMonitoreo(org, q, true); }
  async obtenerMonitoreo(org: string, id: string) { return this.existe(await this.repo.obtenerMonitoreo(org, id), 'Registro de monitoreo'); }
  crearMonitoreo(d: MonitoreoInput, ctx: ContextoAuditoria) { return this.conErrores(() => this.repo.crearMonitoreo(d, ctx)); }
  async actualizarMonitoreo(id: string, d: ActualizarMonitoreoInput, ctx: ContextoAuditoria) { return this.existe(await this.conErrores(() => this.repo.actualizarMonitoreo(id, d, ctx)), 'Registro de monitoreo'); }
  async eliminarMonitoreo(id: string, ctx: ContextoAuditoria) { return this.existe(await this.repo.eliminarMonitoreo(id, ctx), 'Registro de monitoreo'); }

  listarFotos(org: string, q: ConsultaFotos) { return this.repo.listarFotos(org, q); }
  geojsonFotos(org: string) { return this.repo.geojsonFotos(org); }
  async crearFoto(d: FotoCampoInput, buffer: Buffer | undefined, ctx: ContextoAuditoria) {
    if (!buffer) throw new AppError(422, 'Adjunta una imagen en el campo foto', 'FOTO_REQUERIDA');
    let archivos;
    try { archivos = await this.almacenamiento.guardar(buffer, d.fechaCaptura ?? new Date()); }
    catch { throw new AppError(422, 'No se pudo procesar la imagen. Verifica que sea un archivo de imagen válido.', 'FOTO_INVALIDA'); }
    try { return await this.conErrores(() => this.repo.crearFoto(d, { originalUrl: archivos.archivoUrl, miniaturaUrl: archivos.miniaturaUrl }, ctx)); }
    catch (error) { await this.almacenamiento.eliminar([archivos.archivoUrl, archivos.miniaturaUrl]); throw error; }
  }
  async eliminarFoto(org: string, id: string, ctx: ContextoAuditoria) {
    const foto = await this.existe(await this.repo.eliminarFoto(org, id, ctx), 'Foto');
    await this.almacenamiento.eliminar([foto.archivoUrl, foto.archivoThumbUrl]);
    return { eliminado: true, id };
  }

  private existe<T>(fila: T | undefined, recurso: string): T { if (!fila) throw new NotFoundError(recurso); return fila; }
  private async conErrores<T>(operacion: () => Promise<T>): Promise<T> {
    try { return await operacion(); }
    catch (error) {
      const codigo = (error as { code?: string }).code;
      if (codigo === '23505') throw new ConflictError('Ya existe un cultivo con ese nombre y variedad');
      if (codigo === '23503') throw new AppError(422, 'Una referencia del registro no existe o no es válida', 'REFERENCIA_INVALIDA');
      if (codigo === '22023') throw new AppError(422, (error as Error).message, 'GEOMETRIA_INVALIDA');
      throw error;
    }
  }
}

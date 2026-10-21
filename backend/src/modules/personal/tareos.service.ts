import { AppError, ConflictError, NotFoundError } from '../../shared/errors.ts';
import type { ContextoAuditoria } from '../../shared/auditoria.ts';
import { TareosRepository } from './tareos.repository.ts';
import type { ActualizarTareoInput, ConsultaTareos, TareoInput } from './tareos.schemas.ts';

const subtotal = (cantidad: string | number, precio: string | number) => (Math.round((Number(cantidad) * Number(precio) + Number.EPSILON) * 100) / 100).toFixed(2);

export class TareosService {
  constructor(private readonly repo = new TareosRepository()) {}
  private async existe<T>(v: T | undefined, recurso = 'Tareo'): Promise<T> { if (!v) throw new NotFoundError(recurso); return v; }
  private async validar(org: string, empleadoId: string, parcelaId?: string | null) {
    if (!await this.repo.empleadoValido(org, empleadoId)) throw new AppError(422, 'El empleado no existe en la organización', 'EMPLEADO_INVALIDO');
    if (parcelaId && !await this.repo.parcelaValida(org, parcelaId)) throw new AppError(422, 'La parcela no existe o está inactiva', 'PARCELA_INVALIDA');
  }
  listar(org: string, q: ConsultaTareos) { return this.repo.listar(org, q); }
  obtener(org: string, id: string) { return this.existe(this.repo.obtener(org, id)); }
  async crear(d: TareoInput, ctx: ContextoAuditoria) { await this.validar(ctx.organizacionId, d.empleadoId, d.parcelaId); return this.repo.crear({ ...d, subtotal: subtotal(d.cantidad, d.precioUnitario) }, ctx); }
  async actualizar(org: string, id: string, cambios: ActualizarTareoInput, ctx: ContextoAuditoria) {
    const actual = await this.existe(await this.repo.obtener(org, id));
    if (actual.tareo.estado !== 'pendiente') throw new ConflictError('Solo se pueden modificar tareos pendientes de aprobación');
    const campos = { ...cambios };
    const cantidad = campos.cantidad ?? actual.tareo.cantidad, precio = campos.precioUnitario ?? actual.tareo.precioUnitario;
    const parcelaId = campos.parcelaId === undefined ? actual.tareo.parcelaId : campos.parcelaId;
    await this.validar(org, actual.tareo.empleadoId, parcelaId);
    const fila = await this.repo.actualizar(org, id, { ...campos, subtotal: subtotal(cantidad, precio) }, ctx);
    return this.existe(fila);
  }
  async aprobar(org: string, id: string, ctx: ContextoAuditoria) { return this.existe(await this.repo.aprobar(org, id, ctx)); }
  async eliminar(org: string, id: string, ctx: ContextoAuditoria) { return this.existe(await this.repo.eliminar(org, id, ctx)); }
  pendientes(org: string) { return this.repo.pendientes(org); }
}

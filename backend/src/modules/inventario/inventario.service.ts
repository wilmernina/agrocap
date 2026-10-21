import { registrarAuditoria, type ContextoAuditoria, type TransaccionDB } from '../../shared/auditoria.ts'; import type { AjusteInventarioInput, ConsultaMovimientos } from './inventario.schemas.ts'; import { InventarioRepository, aplicarCambioStock } from './inventario.repository.ts';
type ConsumoCampo = { productoId: string; almacenId: string; cantidad: number; referenciaId: string; parcelaId: string; motivo: string };
export class InventarioService {
  constructor(private readonly repository = new InventarioRepository()) {}
  listar(org: string, consulta: ConsultaMovimientos) { return this.repository.listar(org, consulta); }
  almacenes(org: string) { return this.repository.listarAlmacenes(org); }
  existencias(org: string, almacenId?: string) { return this.repository.listarExistencias(org, almacenId); }
  ajustar(datos: AjusteInventarioInput, contexto: ContextoAuditoria) { return this.repository.ajustar(datos, contexto); }
  registrarSalida(tx: TransaccionDB, contexto: ContextoAuditoria, consumo: ConsumoCampo) {
    return this.registrarMovimientoCampo(tx, contexto, { productoId: consumo.productoId, almacenId: consumo.almacenId, delta: -consumo.cantidad, tipo: 'salida', motivo: consumo.motivo, referenciaTipo: 'actividad_campo', referenciaId: consumo.referenciaId, parcelaId: consumo.parcelaId });
  }
  registrarEntrada(tx: TransaccionDB, contexto: ContextoAuditoria, consumo: ConsumoCampo) {
    return this.registrarMovimientoCampo(tx, contexto, { productoId: consumo.productoId, almacenId: consumo.almacenId, delta: consumo.cantidad, tipo: 'entrada', motivo: consumo.motivo, referenciaTipo: 'actividad_campo_reversion', referenciaId: consumo.referenciaId, parcelaId: consumo.parcelaId });
  }
  private async registrarMovimientoCampo(tx: TransaccionDB, contexto: ContextoAuditoria, cambio: Parameters<typeof aplicarCambioStock>[2]) {
    const movimiento = await aplicarCambioStock(tx, contexto, cambio);
    await registrarAuditoria(tx, contexto, 'CREAR', 'movimientos_inventario', movimiento.id, null, movimiento);
    return movimiento;
  }
}

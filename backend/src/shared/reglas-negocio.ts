import { AppError, ConflictError } from './errors.ts';

export type LineaVentaCalculable = { cantidad: number; precioUnitario: number; descuento: number };

export function calcularNuevoStock(stockAnterior: number, delta: number, permiteStockNegativo: boolean) {
  const stockNuevo = Math.round((stockAnterior + delta) * 1000) / 1000;
  if (stockNuevo < 0 && !permiteStockNegativo) throw new AppError(409, 'Stock insuficiente', 'STOCK_INSUFICIENTE');
  return stockNuevo;
}

export function calcularTotalesVenta(items: LineaVentaCalculable[], descuento: number, impuestos: number) {
  const subtotal = Math.round(items.reduce((suma, item) => suma + item.cantidad * item.precioUnitario - item.descuento, 0) * 100) / 100;
  const total = Math.round((subtotal - descuento + impuestos) * 100) / 100;
  if (total < 0) throw new AppError(422, 'El descuento supera el subtotal', 'TOTAL_INVALIDO');
  return { subtotal, descuento, impuestos, total };
}

export function calcularPagoAcumulado(total: number, pagado: number, nuevoPago: number) {
  const acumulado = Math.round((pagado + nuevoPago) * 100) / 100;
  if (acumulado > total) throw new ConflictError('El pago supera el saldo pendiente');
  return { acumulado, completado: Math.abs(acumulado - total) < 0.005 };
}

import type { MetaPaginacion, Respuesta, RespuestaPaginada } from './fase1';
export type { MetaPaginacion, Respuesta, RespuestaPaginada };

export type EstadoCompra = 'borrador' | 'confirmada' | 'anulada';
export type CompraResumen = { id:string; numeroFactura:string; proveedor:string; almacen:string; fecha:string; subtotal:string; impuestos:string; total:string; estado:EstadoCompra; observaciones:string|null };
export type CompraDetalle = {
  id:string; organizacionId:string; almacenId:string; numeroFactura:string; proveedorId:string; fecha:string;
  proveedor:string; almacen:string; subtotal:string; impuestos:string; total:string; estado:EstadoCompra; observaciones:string|null; usuarioId:string;
  items:Array<{id:string;productoId:string;producto:string;sku:string;cantidad:string;precioUnitario:string;subtotal:string;lote:string|null;fechaVencimiento:string|null}>;
};
export type CompraInput = { numeroFactura:string; proveedorId:string; almacenId:string; fecha?:string; impuestos:number; observaciones:string|null; confirmar:boolean; items:Array<{productoId:string;cantidad:number;precioUnitario:number;lote:string|null;fechaVencimiento:string|null}> };

export type EstadoVenta = 'borrador'|'confirmada'|'pagada'|'anulada';
export type VentaResumen = { id:string; numeroFactura:string; cliente:string|null; fecha:string; total:string; tipoPago:'contado'|'credito'; estado:EstadoVenta };
export type PagoVenta = { id:string;ventaId:string;fecha:string;monto:string;metodoPago:'efectivo'|'transferencia'|'qr'|'cheque';referencia:string|null;usuarioId:string };
export type VentaDetalle = {
  id:string;organizacionId:string;almacenId:string;numeroFactura:string;clienteId:string|null;fecha:string;
  cliente:string|null;almacen:string;subtotal:string;descuento:string;impuestos:string;total:string;tipoPago:'contado'|'credito';estado:EstadoVenta;
  numeroReceta:string|null;observaciones:string|null;usuarioId:string;
  items:Array<{id:string;productoId:string;producto:string;sku:string;loteProductoId:string|null;cantidad:string;precioUnitario:string;descuento:string;subtotal:string}>;
  pagos:PagoVenta[];
};
export type VentaInput = { numeroFactura?:string;clienteId:string|null;almacenId:string;fecha?:string;descuento:number;impuestos:number;tipoPago:'contado'|'credito';numeroReceta:string|null;observaciones:string|null;confirmar:boolean;items:Array<{productoId:string;loteProductoId:null;cantidad:number;precioUnitario:number;descuento:number}> };

export type ReporteVentas = { resumen:{cantidad:number;subtotal:number;descuentos:number;impuestos:number;total:number;cobrado:number;saldo:number};data:Array<{id:string;numeroFactura:string;fecha:string;cliente:string|null;tipoPago:'contado'|'credito';estado:'confirmada'|'pagada';subtotal:string;descuento:string;impuestos:string;total:string;pagado:string;saldo:string}> };
export type ProductoMasVendido = { productoId:string;sku:string;producto:string;categoria:string;cantidadVendida:string;importeVendido:string;numeroVentas:number };
export type StockValorizado = { resumen:{productos:number;unidades:number;valorCosto:number;valorVenta:number};data:Array<{productoId:string;sku:string;producto:string;categoria:string;stockActual:string;precioCosto:string;valorCosto:string;precioVenta:string;valorVenta:string}> };

# Parte 8 — operaciones, reportes y dashboard

## Compras e ingresos

La ruta `/compras` permite:

- buscar y filtrar compras por estado y periodo;
- guardar borradores y editar únicamente mientras sigan en borrador;
- registrar productos, costo, lote y fecha de vencimiento;
- confirmar una compra para generar lotes, movimientos y stock;
- anular con confirmación previa y reversión transaccional;
- consultar el detalle completo.

## Ventas POS

La ruta `/ventas` incluye:

- búsqueda rápida por nombre, SKU o código de barras;
- carrito con cantidad, precio y descuento por línea;
- validación visual de stock disponible;
- cliente opcional, contado o crédito, impuestos y descuento general;
- número de receta obligatorio cuando corresponde;
- borradores editables, confirmación y anulación;
- cobro automático de ventas al contado y pagos parciales posteriores;
- métodos efectivo, QR, transferencia y cheque.

## Dashboard

El inicio consume reportes reales y presenta:

- ventas del día y del mes;
- monto cobrado y saldo pendiente;
- productos bajo stock mínimo;
- gráfico de ventas de los últimos 30 días;
- productos más vendidos, ventas recientes y alertas de inventario.

## Reportes

La ruta `/reportes` contiene:

- ventas por periodo;
- productos más vendidos;
- stock valorizado a costo y a precio de venta;
- exportación CSV compatible con Excel;
- exportación PDF descargable mediante jsPDF.

Todas las fechas de los filtros comerciales se interpretan en `America/La_Paz` e incluyen el día final completo.

## Seguridad y permisos

- Admin: puede anular compras y ventas.
- Almacenero: crea, edita y confirma compras.
- Vendedor: crea, edita y confirma ventas, además de registrar pagos.
- Otros roles: acceso de consulta.

La interfaz oculta acciones no disponibles, pero el backend continúa siendo la autoridad definitiva.

# Parte 4 — inventario, compras y ventas

## Inventario

- `GET /api/v1/inventario/almacenes`
- `GET /api/v1/inventario/existencias?almacenId=`
- `GET /api/v1/inventario/movimientos`
- `POST /api/v1/inventario/ajuste`

Los movimientos aceptan filtros `productoId`, `almacenId`, `tipo`, `desde`, `hasta`, `pagina` y `limite`. Cada cambio bloquea producto y existencia, conserva stock anterior/nuevo y respeta `permite_stock_negativo` de la organización.

## Compras

- `GET /api/v1/compras`
- `GET /api/v1/compras/:id`
- `POST /api/v1/compras`
- `PUT /api/v1/compras/:id`
- `POST /api/v1/compras/:id/confirmar`
- `POST /api/v1/compras/:id/anular`

`POST` acepta `confirmar`. Si es `false`, guarda un borrador editable sin afectar stock. Si es `true`, crea y confirma dentro de la misma transacción. Confirmar genera lotes y movimientos; anular genera movimientos compensatorios y descuenta los lotes cuando todavía existe cantidad suficiente.

## Ventas

- `GET /api/v1/ventas`
- `GET /api/v1/ventas/:id`
- `POST /api/v1/ventas`
- `PUT /api/v1/ventas/:id`
- `POST /api/v1/ventas/:id/confirmar`
- `POST /api/v1/ventas/:id/pagar`
- `POST /api/v1/ventas/:id/anular`

`POST` también acepta `confirmar`. La confirmación valida stock y receta, descuenta lotes opcionales y crea el kardex. Los pagos no pueden exceder el saldo; al cubrir el total cambian la venta a `pagada`. La anulación conserva los pagos para auditoría y revierte inventario.

## Garantías transaccionales

- Los importes son recalculados en servidor y se persisten como `numeric(12,2)`.
- Las cantidades se persisten como `numeric(14,3)`.
- Cabecera, detalle, lotes, existencias, stock global, kardex y auditoría comparten transacción.
- Las filas de stock se bloquean para evitar sobreventa concurrente.
- `referencia_tipo`, `referencia_id`, `parcela_id` y `orden_servicio_id` permiten integraciones futuras sin acoplamiento.

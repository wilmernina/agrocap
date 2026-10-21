INSERT INTO almacenes (id, organizacion_id, codigo, nombre, activo, created_at, updated_at)
SELECT id, organization_id, code, name, active, created_at, updated_at
FROM warehouses
ON CONFLICT (id) DO NOTHING;
--> statement-breakpoint

INSERT INTO existencias_almacen (organizacion_id, almacen_id, producto_id, cantidad, updated_at)
SELECT s.organization_id, s.warehouse_id, s.product_id, s.quantity, s.updated_at
FROM stocks s
INNER JOIN productos p ON p.id = s.product_id
ON CONFLICT (almacen_id, producto_id) DO UPDATE
SET cantidad = excluded.cantidad, updated_at = excluded.updated_at;
--> statement-breakpoint

WITH movimientos_reconstruidos AS (
  SELECT
    m.*,
    s.quantity::numeric AS stock_final,
    coalesce(sum(m.quantity::numeric) OVER (
      PARTITION BY m.warehouse_id, m.product_id
      ORDER BY m.occurred_at, m.id
      ROWS BETWEEN 1 FOLLOWING AND UNBOUNDED FOLLOWING
    ), 0) AS movimientos_posteriores
  FROM inventory_movements m
  INNER JOIN stocks s ON s.warehouse_id = m.warehouse_id AND s.product_id = m.product_id
  INNER JOIN productos p ON p.id = m.product_id
)
INSERT INTO movimientos_inventario (
  id, organizacion_id, producto_id, almacen_id, tipo, cantidad,
  stock_anterior, stock_nuevo, motivo, referencia_tipo, referencia_id,
  usuario_id, created_at
)
SELECT
  id,
  organization_id,
  product_id,
  warehouse_id,
  CASE
    WHEN quantity::numeric >= 0 THEN 'entrada'::tipo_movimiento
    ELSE 'salida'::tipo_movimiento
  END,
  abs(quantity::numeric),
  stock_final - movimientos_posteriores - quantity::numeric,
  stock_final - movimientos_posteriores,
  'Movimiento migrado del prototipo',
  reference_type,
  reference_id,
  created_by,
  occurred_at
FROM movimientos_reconstruidos
ON CONFLICT (id) DO NOTHING;

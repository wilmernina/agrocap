-- Migra catálogos y terceros del prototipo conservando sus UUID.
INSERT INTO unidades_medida (id, organizacion_id, nombre, abreviatura, activo, created_at, updated_at)
SELECT id, organization_id, name, lower(symbol), true, created_at, updated_at
FROM units
ON CONFLICT (id) DO NOTHING;
--> statement-breakpoint

INSERT INTO categorias_producto (id, organizacion_id, nombre, descripcion, activo, created_at, updated_at)
SELECT id, organization_id, name, null, true, created_at, updated_at
FROM categories
ON CONFLICT (id) DO NOTHING;
--> statement-breakpoint

INSERT INTO categorias_producto (organizacion_id, nombre, descripcion, activo)
SELECT DISTINCT p.organization_id, 'Otros', 'Categoría creada durante la migración', true
FROM products p
WHERE p.category_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM categorias_producto c
    WHERE c.organizacion_id = p.organization_id AND lower(c.nombre) = 'otros'
  );
--> statement-breakpoint

INSERT INTO productos (
  id, organizacion_id, sku, nombre, descripcion, categoria_id, unidad_medida_id, tipo,
  precio_costo, precio_venta, stock_actual, stock_minimo, stock_maximo,
  requiere_receta, activo, created_at, updated_at
)
SELECT
  p.id,
  p.organization_id,
  p.sku,
  p.name,
  p.description,
  coalesce(p.category_id, (
    SELECT c.id FROM categorias_producto c
    WHERE c.organizacion_id = p.organization_id AND lower(c.nombre) = 'otros'
    LIMIT 1
  )),
  p.unit_id,
  CASE
    WHEN lower(p.name) LIKE '%semilla%' THEN 'semilla'::tipo_producto
    WHEN lower(p.name) LIKE '%fertiliz%' OR lower(p.name) LIKE '%urea%' THEN 'fertilizante'::tipo_producto
    WHEN lower(p.name) LIKE '%herbicida%' OR lower(p.name) LIKE '%glifosato%' THEN 'herbicida'::tipo_producto
    WHEN lower(p.name) LIKE '%fungicida%' THEN 'fungicida'::tipo_producto
    WHEN lower(p.name) LIKE '%insecticida%' THEN 'insecticida'::tipo_producto
    ELSE 'otro'::tipo_producto
  END,
  p.cost_price,
  p.sale_price,
  coalesce((SELECT sum(s.quantity) FROM stocks s WHERE s.product_id = p.id), 0),
  p.min_stock,
  null,
  false,
  p.active,
  p.created_at,
  p.updated_at
FROM products p
WHERE p.type = 'product'
ON CONFLICT (id) DO NOTHING;
--> statement-breakpoint

INSERT INTO clientes (
  id, organizacion_id, nombre, nit_ci, telefono, email, direccion, tipo,
  limite_credito, activo, created_at, updated_at
)
SELECT
  id, organization_id, name, document, phone, email, address,
  'externo'::tipo_cliente, 0, active, created_at, updated_at
FROM customers
ON CONFLICT (id) DO NOTHING;

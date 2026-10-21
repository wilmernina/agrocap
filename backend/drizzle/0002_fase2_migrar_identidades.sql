-- Conserva los identificadores para que los registros del prototipo puedan migrarse por etapas.
INSERT INTO organizaciones (
  id, nombre, nit, moneda, zona_horaria, permite_stock_negativo, activo, created_at, updated_at
)
SELECT
  id, name, tax_id, currency, timezone, false, active, created_at, updated_at
FROM organizations
ON CONFLICT (id) DO NOTHING;
--> statement-breakpoint

INSERT INTO usuarios (
  id, organizacion_id, nombre, email, password_hash, rol, activo, created_at, updated_at
)
SELECT
  id,
  organization_id,
  name,
  lower(email),
  password_hash,
  CASE role::text
    WHEN 'owner' THEN 'admin'::rol_usuario
    WHEN 'admin' THEN 'admin'::rol_usuario
    WHEN 'seller' THEN 'vendedor'::rol_usuario
    WHEN 'warehouse' THEN 'almacenero'::rol_usuario
    ELSE 'tecnico'::rol_usuario
  END,
  active,
  created_at,
  updated_at
FROM users
ON CONFLICT (id) DO NOTHING;

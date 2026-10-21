CREATE TABLE IF NOT EXISTS registros_sync (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacion_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  cliente_id uuid NOT NULL,
  tipo varchar(30) NOT NULL,
  respuesta jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT registros_sync_org_cliente_uq UNIQUE (organizacion_id, cliente_id)
);
CREATE INDEX IF NOT EXISTS registros_sync_created_idx ON registros_sync (created_at);

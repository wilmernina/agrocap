CREATE TABLE IF NOT EXISTS acopio_productores (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
 name varchar(180) NOT NULL, document varchar(40), phone varchar(40), address text, active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS acopio_productores_org_doc_uq ON acopio_productores(organization_id,document) WHERE document IS NOT NULL;
CREATE TABLE IF NOT EXISTS acopio_silos (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
 code varchar(30) NOT NULL, name varchar(120) NOT NULL, location varchar(160), active boolean NOT NULL DEFAULT true, UNIQUE(organization_id,code)
);
CREATE TABLE IF NOT EXISTS acopio_quality_tables (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
 grain varchar(100) NOT NULL, revision varchar(40) NOT NULL, moisture_limit numeric(7,3) NOT NULL CHECK(moisture_limit BETWEEN 0 AND 100),
 impurity_limit numeric(7,3) NOT NULL CHECK(impurity_limit BETWEEN 0 AND 100), moisture_discount_pct_per_point numeric(9,5) NOT NULL DEFAULT 1,
 impurity_discount_pct_per_point numeric(9,5) NOT NULL DEFAULT 1, approved_by uuid REFERENCES users(id), approved_at timestamptz, active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(organization_id,grain,revision)
);
CREATE TABLE IF NOT EXISTS acopio_contracts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
 producer_id uuid NOT NULL REFERENCES acopio_productores(id), kind varchar(12) NOT NULL CHECK(kind IN ('purchase','sale')),
 grain varchar(100) NOT NULL, quantity_kg numeric(16,3) NOT NULL CHECK(quantity_kg>0), agreed_price numeric(14,4) NOT NULL CHECK(agreed_price>0),
 currency varchar(3) NOT NULL DEFAULT 'BOB', signed_on date NOT NULL DEFAULT CURRENT_DATE, due_on date, status varchar(12) NOT NULL DEFAULT 'open' CHECK(status IN ('open','closed','cancelled')),
 notes text, created_by uuid REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS acopio_receptions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
 ticket varchar(60) NOT NULL, producer_id uuid NOT NULL REFERENCES acopio_productores(id), contract_id uuid REFERENCES acopio_contracts(id), silo_id uuid NOT NULL REFERENCES acopio_silos(id),
 grain varchar(100) NOT NULL, ownership varchar(12) NOT NULL CHECK(ownership IN ('company','custody')),
 vehicle varchar(100) NOT NULL, driver varchar(160) NOT NULL, raw_gross_kg numeric(16,3) NOT NULL CHECK(raw_gross_kg>0), raw_tare_kg numeric(16,3) NOT NULL CHECK(raw_tare_kg>=0 AND raw_tare_kg<raw_gross_kg),
 raw_net_kg numeric(16,3) GENERATED ALWAYS AS (raw_gross_kg-raw_tare_kg) STORED,
 moisture_pct numeric(7,3) NOT NULL CHECK(moisture_pct BETWEEN 0 AND 100), impurity_pct numeric(7,3) NOT NULL CHECK(impurity_pct BETWEEN 0 AND 100),
 quality_table_id uuid NOT NULL REFERENCES acopio_quality_tables(id), moisture_discount_kg numeric(16,3) NOT NULL CHECK(moisture_discount_kg>=0),
 impurity_discount_kg numeric(16,3) NOT NULL CHECK(impurity_discount_kg>=0), accepted_net_kg numeric(16,3) NOT NULL CHECK(accepted_net_kg>=0),
 received_at timestamptz NOT NULL DEFAULT now(), created_by uuid REFERENCES users(id), UNIQUE(organization_id,ticket)
);
CREATE OR REPLACE FUNCTION acopio_reception_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.raw_gross_kg IS DISTINCT FROM OLD.raw_gross_kg OR NEW.raw_tare_kg IS DISTINCT FROM OLD.raw_tare_kg OR NEW.raw_net_kg IS DISTINCT FROM OLD.raw_net_kg THEN
  RAISE EXCEPTION 'Los pesos originales de báscula son inmutables' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS acopio_reception_weights_immutable ON acopio_receptions;
CREATE TRIGGER acopio_reception_weights_immutable BEFORE UPDATE ON acopio_receptions FOR EACH ROW EXECUTE FUNCTION acopio_reception_immutable();
CREATE TABLE IF NOT EXISTS acopio_inventory_lots (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
 reception_id uuid NOT NULL REFERENCES acopio_receptions(id), silo_id uuid NOT NULL REFERENCES acopio_silos(id), grain varchar(100) NOT NULL,
 ownership varchar(12) NOT NULL CHECK(ownership IN ('company','custody')), producer_id uuid NOT NULL REFERENCES acopio_productores(id), quantity_kg numeric(16,3) NOT NULL CHECK(quantity_kg>=0), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS acopio_stock_movements (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
 lot_id uuid NOT NULL REFERENCES acopio_inventory_lots(id), movement_type varchar(16) NOT NULL CHECK(movement_type IN ('receipt','transfer','shrinkage','dispatch')),
 from_silo_id uuid REFERENCES acopio_silos(id), to_silo_id uuid REFERENCES acopio_silos(id), quantity_kg numeric(16,3) NOT NULL CHECK(quantity_kg>0), freight_cost numeric(14,2) NOT NULL DEFAULT 0 CHECK(freight_cost>=0),
 reference varchar(100), occurred_at timestamptz NOT NULL DEFAULT now(), created_by uuid REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS acopio_price_fixes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
 contract_id uuid NOT NULL REFERENCES acopio_contracts(id), quantity_kg numeric(16,3) NOT NULL CHECK(quantity_kg>0), unit_price numeric(14,4) NOT NULL CHECK(unit_price>0), fixed_at timestamptz NOT NULL DEFAULT now(), created_by uuid REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS acopio_settlements (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
 contract_id uuid NOT NULL REFERENCES acopio_contracts(id), kind varchar(12) NOT NULL CHECK(kind IN ('advance','settlement')), amount numeric(14,2) NOT NULL CHECK(amount>0), reference varchar(100), paid_at timestamptz NOT NULL DEFAULT now(), created_by uuid REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS acopio_lots_silo_owner_idx ON acopio_inventory_lots(organization_id,silo_id,ownership,grain);
CREATE INDEX IF NOT EXISTS acopio_movements_lot_date_idx ON acopio_stock_movements(lot_id,occurred_at);
CREATE INDEX IF NOT EXISTS acopio_receptions_org_date_idx ON acopio_receptions(organization_id,received_at DESC);

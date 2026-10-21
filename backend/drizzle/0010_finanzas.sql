CREATE TABLE IF NOT EXISTS finance_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name varchar(120) NOT NULL, kind varchar(12) NOT NULL CHECK (kind IN ('cash','bank')), currency varchar(3) NOT NULL DEFAULT 'BOB',
  opening_balance numeric(14,2) NOT NULL DEFAULT 0, active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS finance_centers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name varchar(120) NOT NULL, code varchar(30) NOT NULL, active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(organization_id,code)
);
CREATE TABLE IF NOT EXISTS finance_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  kind varchar(12) NOT NULL CHECK(kind IN ('receivable','payable','advance','expense')), description varchar(240) NOT NULL,
  party_name varchar(180), reference varchar(100), amount numeric(14,2) NOT NULL CHECK(amount>0), paid_amount numeric(14,2) NOT NULL DEFAULT 0,
  due_date date, status varchar(12) NOT NULL DEFAULT 'open' CHECK(status IN ('open','partial','paid','void')), center_id uuid REFERENCES finance_centers(id),
  source_type varchar(30), source_id uuid, created_by uuid REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id,source_type,source_id)
);
CREATE TABLE IF NOT EXISTS finance_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES finance_accounts(id), document_id uuid REFERENCES finance_documents(id), direction varchar(8) NOT NULL CHECK(direction IN ('in','out')),
  amount numeric(14,2) NOT NULL CHECK(amount>0), description varchar(240) NOT NULL, reference varchar(100), moved_at timestamptz NOT NULL DEFAULT now(), created_by uuid REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS finance_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  center_id uuid REFERENCES finance_centers(id), name varchar(160) NOT NULL, period_start date NOT NULL, period_end date NOT NULL,
  amount numeric(14,2) NOT NULL CHECK(amount>=0), created_at timestamptz NOT NULL DEFAULT now(), CHECK(period_end>=period_start)
);
CREATE TABLE IF NOT EXISTS finance_chart_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code varchar(30) NOT NULL, name varchar(160) NOT NULL, class varchar(20) NOT NULL CHECK(class IN ('asset','liability','equity','income','expense')),
  parent_id uuid REFERENCES finance_chart_accounts(id), active boolean NOT NULL DEFAULT true, UNIQUE(organization_id,code)
);
CREATE TABLE IF NOT EXISTS finance_journals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  number bigserial, journal_date date NOT NULL DEFAULT CURRENT_DATE, description varchar(240) NOT NULL, source varchar(60), status varchar(12) NOT NULL DEFAULT 'posted' CHECK(status IN ('draft','posted','reversed')),
  created_by uuid REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS finance_journal_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), journal_id uuid NOT NULL REFERENCES finance_journals(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES finance_chart_accounts(id), center_id uuid REFERENCES finance_centers(id), debit numeric(14,2) NOT NULL DEFAULT 0, credit numeric(14,2) NOT NULL DEFAULT 0,
  CHECK(debit>=0 AND credit>=0 AND NOT (debit>0 AND credit>0))
);
CREATE TABLE IF NOT EXISTS finance_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name varchar(160) NOT NULL, acquired_on date NOT NULL, cost numeric(14,2) NOT NULL CHECK(cost>0), useful_life_months integer NOT NULL CHECK(useful_life_months>0),
  salvage_value numeric(14,2) NOT NULL DEFAULT 0, active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS finance_documents_org_due_idx ON finance_documents(organization_id,due_date);
CREATE INDEX IF NOT EXISTS finance_movements_org_date_idx ON finance_movements(organization_id,moved_at);

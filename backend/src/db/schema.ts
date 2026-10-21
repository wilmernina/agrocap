import { boolean, index, integer, numeric, pgEnum, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

const audit = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
};

export const userRole = pgEnum('user_role', ['owner', 'admin', 'seller', 'warehouse', 'viewer']);
export const productType = pgEnum('product_type', ['product', 'service']);
export const saleStatus = pgEnum('sale_status', ['draft', 'confirmed', 'cancelled']);
export const paymentMethod = pgEnum('payment_method', ['cash', 'transfer', 'card', 'credit', 'other']);
export const movementType = pgEnum('movement_type', ['entry', 'sale', 'adjustment_in', 'adjustment_out', 'sale_reversal']);
export const entryStatus = pgEnum('entry_status', ['draft', 'confirmed', 'cancelled']);

export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 160 }).notNull(),
  taxId: varchar('tax_id', { length: 40 }),
  currency: varchar('currency', { length: 3 }).notNull().default('BOB'),
  timezone: varchar('timezone', { length: 60 }).notNull().default('America/La_Paz'),
  active: boolean('active').notNull().default(true),
  ...audit,
});

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  name: varchar('name', { length: 120 }).notNull(),
  email: varchar('email', { length: 180 }).notNull(),
  passwordHash: text('password_hash').notNull(),
  role: userRole('role').notNull().default('seller'),
  active: boolean('active').notNull().default(true),
  ...audit,
}, (t) => [uniqueIndex('users_email_uq').on(t.email), index('users_org_idx').on(t.organizationId)]);

export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: varchar('token_hash', { length: 64 }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex('refresh_token_hash_uq').on(t.tokenHash), index('refresh_user_idx').on(t.userId)]);

export const units = pgTable('units', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  name: varchar('name', { length: 80 }).notNull(),
  symbol: varchar('symbol', { length: 12 }).notNull(),
  ...audit,
}, (t) => [uniqueIndex('units_org_symbol_uq').on(t.organizationId, t.symbol)]);

export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  name: varchar('name', { length: 100 }).notNull(),
  ...audit,
}, (t) => [uniqueIndex('categories_org_name_uq').on(t.organizationId, t.name)]);

export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  categoryId: uuid('category_id').references(() => categories.id),
  unitId: uuid('unit_id').notNull().references(() => units.id),
  sku: varchar('sku', { length: 50 }).notNull(),
  name: varchar('name', { length: 160 }).notNull(),
  description: text('description'),
  type: productType('type').notNull().default('product'),
  salePrice: numeric('sale_price', { precision: 14, scale: 2 }).notNull().default('0'),
  costPrice: numeric('cost_price', { precision: 14, scale: 2 }).notNull().default('0'),
  minStock: numeric('min_stock', { precision: 14, scale: 3 }).notNull().default('0'),
  active: boolean('active').notNull().default(true),
  ...audit,
}, (t) => [uniqueIndex('products_org_sku_uq').on(t.organizationId, t.sku), index('products_org_name_idx').on(t.organizationId, t.name)]);

export const customers = pgTable('customers', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  document: varchar('document', { length: 40 }),
  name: varchar('name', { length: 160 }).notNull(),
  phone: varchar('phone', { length: 30 }),
  email: varchar('email', { length: 180 }),
  address: text('address'),
  active: boolean('active').notNull().default(true),
  ...audit,
}, (t) => [index('customers_org_name_idx').on(t.organizationId, t.name)]);

export const warehouses = pgTable('warehouses', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  name: varchar('name', { length: 120 }).notNull(),
  code: varchar('code', { length: 20 }).notNull(),
  active: boolean('active').notNull().default(true),
  ...audit,
}, (t) => [uniqueIndex('warehouses_org_code_uq').on(t.organizationId, t.code)]);

export const stocks = pgTable('stocks', {
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  warehouseId: uuid('warehouse_id').notNull().references(() => warehouses.id),
  productId: uuid('product_id').notNull().references(() => products.id),
  quantity: numeric('quantity', { precision: 14, scale: 3 }).notNull().default('0'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.warehouseId, t.productId] }), index('stocks_org_idx').on(t.organizationId)]);

export const documentSequences = pgTable('document_sequences', {
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  documentType: varchar('document_type', { length: 30 }).notNull(),
  year: integer('year').notNull(),
  currentValue: integer('current_value').notNull().default(0),
}, (t) => [primaryKey({ columns: [t.organizationId, t.documentType, t.year] })]);

export const sales = pgTable('sales', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  customerId: uuid('customer_id').references(() => customers.id),
  warehouseId: uuid('warehouse_id').notNull().references(() => warehouses.id),
  number: varchar('number', { length: 30 }).notNull(),
  soldAt: timestamp('sold_at', { withTimezone: true }).notNull().defaultNow(),
  status: saleStatus('status').notNull().default('confirmed'),
  subtotal: numeric('subtotal', { precision: 14, scale: 2 }).notNull(),
  discount: numeric('discount', { precision: 14, scale: 2 }).notNull().default('0'),
  total: numeric('total', { precision: 14, scale: 2 }).notNull(),
  notes: text('notes'),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  ...audit,
}, (t) => [uniqueIndex('sales_org_number_uq').on(t.organizationId, t.number), index('sales_org_date_idx').on(t.organizationId, t.soldAt)]);

export const saleItems = pgTable('sale_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  saleId: uuid('sale_id').notNull().references(() => sales.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').notNull().references(() => products.id),
  description: varchar('description', { length: 180 }).notNull(),
  quantity: numeric('quantity', { precision: 14, scale: 3 }).notNull(),
  unitPrice: numeric('unit_price', { precision: 14, scale: 2 }).notNull(),
  discount: numeric('discount', { precision: 14, scale: 2 }).notNull().default('0'),
  total: numeric('total', { precision: 14, scale: 2 }).notNull(),
});

export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  saleId: uuid('sale_id').notNull().references(() => sales.id),
  amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
  method: paymentMethod('method').notNull(),
  reference: varchar('reference', { length: 100 }),
  paidAt: timestamp('paid_at', { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid('created_by').notNull().references(() => users.id),
});

export const stockEntries = pgTable('stock_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  warehouseId: uuid('warehouse_id').notNull().references(() => warehouses.id),
  number: varchar('number', { length: 30 }).notNull(),
  source: varchar('source', { length: 80 }).notNull().default('purchase'),
  reference: varchar('reference', { length: 100 }),
  receivedAt: timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
  status: entryStatus('status').notNull().default('confirmed'),
  notes: text('notes'),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  ...audit,
}, (t) => [uniqueIndex('entries_org_number_uq').on(t.organizationId, t.number)]);

export const stockEntryItems = pgTable('stock_entry_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  entryId: uuid('entry_id').notNull().references(() => stockEntries.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').notNull().references(() => products.id),
  quantity: numeric('quantity', { precision: 14, scale: 3 }).notNull(),
  unitCost: numeric('unit_cost', { precision: 14, scale: 2 }).notNull().default('0'),
});

export const inventoryMovements = pgTable('inventory_movements', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  warehouseId: uuid('warehouse_id').notNull().references(() => warehouses.id),
  productId: uuid('product_id').notNull().references(() => products.id),
  type: movementType('type').notNull(),
  quantity: numeric('quantity', { precision: 14, scale: 3 }).notNull(),
  unitCost: numeric('unit_cost', { precision: 14, scale: 2 }),
  referenceType: varchar('reference_type', { length: 40 }).notNull(),
  referenceId: uuid('reference_id').notNull(),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid('created_by').notNull().references(() => users.id),
}, (t) => [index('movements_product_date_idx').on(t.organizationId, t.productId, t.occurredAt)]);

export const saleRelations = relations(sales, ({ many, one }) => ({
  items: many(saleItems), customer: one(customers, { fields: [sales.customerId], references: [customers.id] }),
}));
export const saleItemRelations = relations(saleItems, ({ one }) => ({ sale: one(sales, { fields: [saleItems.saleId], references: [sales.id] }) }));

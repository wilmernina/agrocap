import { and, asc, count, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import { categories, customers, products, stocks, units, warehouses } from '../../db/schema.ts';

type ProductInput = Omit<typeof products.$inferInsert, 'organizationId' | 'salePrice' | 'costPrice' | 'minStock'> & { salePrice?: number; costPrice?: number; minStock?: number };
type CustomerInput = Omit<typeof customers.$inferInsert, 'organizationId'>;
type UnitInput = Omit<typeof units.$inferInsert, 'organizationId'>;
type CategoryInput = Omit<typeof categories.$inferInsert, 'organizationId'>;
type WarehouseInput = Omit<typeof warehouses.$inferInsert, 'organizationId'>;

export class CatalogRepository {
  async listProducts(orgId: string, page: number, limit: number, search: string) {
    const filter = and(eq(products.organizationId, orgId), search ? or(ilike(products.name, `%${search}%`), ilike(products.sku, `%${search}%`)) : undefined);
    const [data, total] = await Promise.all([
      db.select({ id: products.id, sku: products.sku, name: products.name, description: products.description, type: products.type, salePrice: products.salePrice, costPrice: products.costPrice, minStock: products.minStock, active: products.active, unitId: products.unitId, categoryId: products.categoryId, unit: units.symbol, category: categories.name, stock: sql<string>`coalesce(sum(${stocks.quantity}), 0)` }).from(products).innerJoin(units, eq(products.unitId, units.id)).leftJoin(categories, eq(products.categoryId, categories.id)).leftJoin(stocks, eq(products.id, stocks.productId)).where(filter).groupBy(products.id, units.symbol, categories.name).orderBy(asc(products.name)).limit(limit).offset((page - 1) * limit),
      db.select({ value: count() }).from(products).where(filter),
    ]);
    return { data, total: total[0]?.value ?? 0 };
  }
  async createProduct(orgId: string, input: ProductInput) { const [row] = await db.insert(products).values({ ...input, salePrice: String(input.salePrice ?? 0), costPrice: String(input.costPrice ?? 0), minStock: String(input.minStock ?? 0), organizationId: orgId }).returning(); return row; }
  async updateProduct(orgId: string, id: string, input: Partial<ProductInput>) { const { salePrice, costPrice, minStock, ...rest } = input; const values: Partial<typeof products.$inferInsert> = { ...rest, ...(salePrice !== undefined ? { salePrice: String(salePrice) } : {}), ...(costPrice !== undefined ? { costPrice: String(costPrice) } : {}), ...(minStock !== undefined ? { minStock: String(minStock) } : {}), updatedAt: new Date() }; const [row] = await db.update(products).set(values).where(and(eq(products.id, id), eq(products.organizationId, orgId))).returning(); return row; }
  async listCustomers(orgId: string, page: number, limit: number, search: string) { const filter = and(eq(customers.organizationId, orgId), search ? or(ilike(customers.name, `%${search}%`), ilike(customers.document, `%${search}%`)) : undefined); const [data, total] = await Promise.all([db.select().from(customers).where(filter).orderBy(asc(customers.name)).limit(limit).offset((page - 1) * limit), db.select({ value: count() }).from(customers).where(filter)]); return { data, total: total[0]?.value ?? 0 }; }
  async createCustomer(orgId: string, input: CustomerInput) { const [row] = await db.insert(customers).values({ ...input, organizationId: orgId }).returning(); return row; }
  async updateCustomer(orgId: string, id: string, input: Partial<CustomerInput>) { const [row] = await db.update(customers).set({ ...input, updatedAt: new Date() }).where(and(eq(customers.id, id), eq(customers.organizationId, orgId))).returning(); return row; }
  listUnits(orgId: string) { return db.select().from(units).where(eq(units.organizationId, orgId)).orderBy(asc(units.name)); }
  async createUnit(orgId: string, input: UnitInput) { const [row] = await db.insert(units).values({ ...input, organizationId: orgId }).returning(); return row; }
  listCategories(orgId: string) { return db.select().from(categories).where(eq(categories.organizationId, orgId)).orderBy(asc(categories.name)); }
  async createCategory(orgId: string, input: CategoryInput) { const [row] = await db.insert(categories).values({ ...input, organizationId: orgId }).returning(); return row; }
  listWarehouses(orgId: string) { return db.select().from(warehouses).where(eq(warehouses.organizationId, orgId)).orderBy(asc(warehouses.name)); }
  async createWarehouse(orgId: string, input: WarehouseInput) { const [row] = await db.insert(warehouses).values({ ...input, organizationId: orgId }).returning(); return row; }
  listStock(orgId: string, warehouseId?: string) { return db.select({ productId: products.id, sku: products.sku, product: products.name, unit: units.symbol, warehouseId: warehouses.id, warehouse: warehouses.name, quantity: stocks.quantity, minStock: products.minStock, updatedAt: stocks.updatedAt }).from(stocks).innerJoin(products, eq(stocks.productId, products.id)).innerJoin(units, eq(products.unitId, units.id)).innerJoin(warehouses, eq(stocks.warehouseId, warehouses.id)).where(and(eq(stocks.organizationId, orgId), warehouseId ? eq(stocks.warehouseId, warehouseId) : undefined)).orderBy(asc(products.name)); }
}

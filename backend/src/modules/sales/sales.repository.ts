import { and, count, desc, eq, gte, inArray, ilike, or, sql, sum } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import { customers, documentSequences, inventoryMovements, payments, products, saleItems, sales, stocks, warehouses } from '../../db/schema.ts';
import { AppError, ConflictError, NotFoundError } from '../../shared/errors.ts';

export type NewSale = { organizationId: string; userId: string; warehouseId: string; customerId?: string | null; soldAt?: Date; discount: number; notes?: string | null; items: { productId: string; quantity: number; unitPrice: number; discount: number }[]; payment?: { amount: number; method: 'cash'|'transfer'|'card'|'credit'|'other'; reference?: string|null } };
const dec = (n: number) => n.toFixed(2); const qty = (n: number) => n.toFixed(3);

export class SalesRepository {
  async create(input: NewSale) {
    return db.transaction(async (tx) => {
      const productRows = await tx.select({ id: products.id, name: products.name, type: products.type }).from(products).where(and(eq(products.organizationId, input.organizationId), eq(products.active, true), inArray(products.id, input.items.map((i) => i.productId))));
      if (productRows.length !== input.items.length) throw new AppError(422, 'Uno o más productos no existen o están inactivos', 'INVALID_PRODUCT');
      const warehouse = await tx.select({ id: warehouses.id }).from(warehouses).where(and(eq(warehouses.id, input.warehouseId), eq(warehouses.organizationId, input.organizationId), eq(warehouses.active, true))).limit(1);
      if (!warehouse.length) throw new AppError(422, 'Almacén inválido', 'INVALID_WAREHOUSE');
      if (input.customerId) { const customer = await tx.select({ id: customers.id }).from(customers).where(and(eq(customers.id, input.customerId), eq(customers.organizationId, input.organizationId))).limit(1); if (!customer.length) throw new AppError(422, 'Cliente inválido', 'INVALID_CUSTOMER'); }
      const subtotal = input.items.reduce((a, i) => a + i.quantity * i.unitPrice - i.discount, 0);
      const total = Math.round((subtotal - input.discount) * 100) / 100;
      if (total < 0) throw new AppError(422, 'El descuento supera el subtotal', 'INVALID_TOTAL');
      if (input.payment && input.payment.amount > total) throw new AppError(422, 'El pago supera el total', 'INVALID_PAYMENT');
      const year = (input.soldAt ?? new Date()).getFullYear();
      const [sequence] = await tx.insert(documentSequences).values({ organizationId: input.organizationId, documentType: 'sale', year, currentValue: 1 }).onConflictDoUpdate({ target: [documentSequences.organizationId, documentSequences.documentType, documentSequences.year], set: { currentValue: sql`${documentSequences.currentValue} + 1` } }).returning({ value: documentSequences.currentValue });
      const number = `V-${year}-${String(sequence.value).padStart(6, '0')}`;
      const [sale] = await tx.insert(sales).values({ organizationId: input.organizationId, customerId: input.customerId, warehouseId: input.warehouseId, number, soldAt: input.soldAt, subtotal: dec(subtotal), discount: dec(input.discount), total: dec(total), notes: input.notes, createdBy: input.userId }).returning();
      for (const item of input.items) {
        const product = productRows.find((p) => p.id === item.productId)!;
        const lineTotal = Math.round((item.quantity * item.unitPrice - item.discount) * 100) / 100;
        await tx.insert(saleItems).values({ saleId: sale.id, productId: item.productId, description: product.name, quantity: qty(item.quantity), unitPrice: dec(item.unitPrice), discount: dec(item.discount), total: dec(lineTotal) });
        if (product.type === 'product') {
          const changed = await tx.update(stocks).set({ quantity: sql`${stocks.quantity} - ${qty(item.quantity)}`, updatedAt: new Date() }).where(and(eq(stocks.organizationId, input.organizationId), eq(stocks.warehouseId, input.warehouseId), eq(stocks.productId, item.productId), gte(stocks.quantity, qty(item.quantity)))).returning({ productId: stocks.productId });
          if (!changed.length) throw new ConflictError(`Stock insuficiente para ${product.name}`);
          await tx.insert(inventoryMovements).values({ organizationId: input.organizationId, warehouseId: input.warehouseId, productId: item.productId, type: 'sale', quantity: qty(-item.quantity), referenceType: 'sale', referenceId: sale.id, createdBy: input.userId, occurredAt: input.soldAt });
        }
      }
      if (input.payment && input.payment.amount > 0) await tx.insert(payments).values({ organizationId: input.organizationId, saleId: sale.id, amount: dec(input.payment.amount), method: input.payment.method, reference: input.payment.reference, createdBy: input.userId, paidAt: input.soldAt });
      return sale;
    });
  }
  async list(orgId: string, page: number, limit: number, search: string) {
    const paid = db.select({ saleId: payments.saleId, value: sum(payments.amount).as('paid') }).from(payments).groupBy(payments.saleId).as('paid');
    const filter = and(eq(sales.organizationId, orgId), search ? or(ilike(sales.number, `%${search}%`), ilike(customers.name, `%${search}%`)) : undefined);
    const [data, total] = await Promise.all([
      db.select({ id: sales.id, number: sales.number, soldAt: sales.soldAt, status: sales.status, total: sales.total, paid: sql<string>`coalesce(${paid.value}, 0)`, customer: customers.name, warehouse: warehouses.name }).from(sales).leftJoin(customers, eq(sales.customerId, customers.id)).innerJoin(warehouses, eq(sales.warehouseId, warehouses.id)).leftJoin(paid, eq(sales.id, paid.saleId)).where(filter).orderBy(desc(sales.soldAt)).limit(limit).offset((page - 1) * limit),
      db.select({ value: count() }).from(sales).leftJoin(customers, eq(sales.customerId, customers.id)).where(filter),
    ]); return { data, total: total[0]?.value ?? 0 };
  }
  async get(orgId: string, id: string) { const sale = await db.query.sales.findFirst({ where: and(eq(sales.id, id), eq(sales.organizationId, orgId)), with: { items: true, customer: true } }); if (!sale) throw new NotFoundError('Venta'); const salePayments = await db.select().from(payments).where(eq(payments.saleId, id)).orderBy(desc(payments.paidAt)); return { ...sale, payments: salePayments }; }
  async addPayment(orgId: string, userId: string, saleId: string, input: { amount: number; method: 'cash'|'transfer'|'card'|'credit'|'other'; reference?: string|null }) {
    return db.transaction(async (tx) => { const [sale] = await tx.select({ total: sales.total, status: sales.status }).from(sales).where(and(eq(sales.id, saleId), eq(sales.organizationId, orgId))).for('update'); if (!sale) throw new NotFoundError('Venta'); if (sale.status !== 'confirmed') throw new ConflictError('No se puede cobrar una venta anulada'); const [result] = await tx.select({ paid: sum(payments.amount) }).from(payments).where(eq(payments.saleId, saleId)); if (Number(result.paid ?? 0) + input.amount > Number(sale.total)) throw new ConflictError('El pago supera el saldo pendiente'); const [row] = await tx.insert(payments).values({ organizationId: orgId, saleId, amount: dec(input.amount), method: input.method, reference: input.reference, createdBy: userId }).returning(); return row; });
  }
  async cancel(orgId: string, userId: string, saleId: string) {
    return db.transaction(async (tx) => { const [sale] = await tx.update(sales).set({ status: 'cancelled', updatedAt: new Date() }).where(and(eq(sales.id, saleId), eq(sales.organizationId, orgId), eq(sales.status, 'confirmed'))).returning(); if (!sale) throw new ConflictError('La venta no existe o ya fue anulada'); const items = await tx.select({ productId: saleItems.productId, quantity: saleItems.quantity, type: products.type }).from(saleItems).innerJoin(products, eq(saleItems.productId, products.id)).where(eq(saleItems.saleId, saleId)); for (const item of items) if (item.type === 'product') { await tx.insert(stocks).values({ organizationId: orgId, warehouseId: sale.warehouseId, productId: item.productId, quantity: item.quantity }).onConflictDoUpdate({ target: [stocks.warehouseId, stocks.productId], set: { quantity: sql`${stocks.quantity} + ${item.quantity}`, updatedAt: new Date() } }); await tx.insert(inventoryMovements).values({ organizationId: orgId, warehouseId: sale.warehouseId, productId: item.productId, type: 'sale_reversal', quantity: item.quantity, referenceType: 'sale', referenceId: saleId, createdBy: userId }); } return sale; });
  }
}

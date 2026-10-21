import type { Response } from 'express';
import { idSchema, paginationSchema } from '../../shared/schemas.ts';
import type { AuthRequest } from '../../shared/types.ts';
import { categorySchema, customerSchema, productSchema, unitSchema, warehouseSchema } from './catalog.schemas.ts';
import { CatalogService } from './catalog.service.ts';
const service = new CatalogService(); const org = (r: AuthRequest) => r.user!.organizationId;
export async function listProducts(req: AuthRequest, res: Response) { const q = paginationSchema.parse(req.query); const result = await service.products(org(req), q.page, q.limit, q.search); res.json({ ...result, meta: { page: q.page, limit: q.limit, total: result.total } }); }
export async function createProduct(req: AuthRequest, res: Response) { res.status(201).json({ data: await service.createProduct(org(req), productSchema.parse(req.body)) }); }
export async function updateProduct(req: AuthRequest, res: Response) { res.json({ data: await service.updateProduct(org(req), idSchema.parse(req.params.id), productSchema.partial().parse(req.body)) }); }
export async function listCustomers(req: AuthRequest, res: Response) { const q = paginationSchema.parse(req.query); const result = await service.customers(org(req), q.page, q.limit, q.search); res.json({ ...result, meta: { page: q.page, limit: q.limit, total: result.total } }); }
export async function createCustomer(req: AuthRequest, res: Response) { res.status(201).json({ data: await service.createCustomer(org(req), customerSchema.parse(req.body)) }); }
export async function updateCustomer(req: AuthRequest, res: Response) { res.json({ data: await service.updateCustomer(org(req), idSchema.parse(req.params.id), customerSchema.partial().parse(req.body)) }); }
export async function listUnits(req: AuthRequest, res: Response) { res.json({ data: await service.units(org(req)) }); } export async function createUnit(req: AuthRequest, res: Response) { res.status(201).json({ data: await service.createUnit(org(req), unitSchema.parse(req.body)) }); }
export async function listCategories(req: AuthRequest, res: Response) { res.json({ data: await service.categories(org(req)) }); } export async function createCategory(req: AuthRequest, res: Response) { res.status(201).json({ data: await service.createCategory(org(req), categorySchema.parse(req.body)) }); }
export async function listWarehouses(req: AuthRequest, res: Response) { res.json({ data: await service.warehouses(org(req)) }); } export async function createWarehouse(req: AuthRequest, res: Response) { res.status(201).json({ data: await service.createWarehouse(org(req), warehouseSchema.parse(req.body)) }); }
export async function listStock(req: AuthRequest, res: Response) { const warehouse = req.query.warehouseId ? idSchema.parse(req.query.warehouseId) : undefined; res.json({ data: await service.stock(org(req), warehouse) }); }

import type { Response } from 'express'; import type { AuthRequest } from '../../shared/types.ts'; import { idSchema, paginationSchema } from '../../shared/schemas.ts'; import { paymentSchema, saleSchema } from './sales.schemas.ts'; import { SalesService } from './sales.service.ts';
const service = new SalesService();
export async function createSale(req: AuthRequest, res: Response) { const data = saleSchema.parse(req.body); res.status(201).json({ data: await service.create(req.user!.organizationId, req.user!.id, data) }); }
export async function listSales(req: AuthRequest, res: Response) { const q = paginationSchema.parse(req.query); const result = await service.list(req.user!.organizationId, q.page, q.limit, q.search); res.json({ ...result, meta: { page: q.page, limit: q.limit, total: result.total } }); }
export async function getSale(req: AuthRequest, res: Response) { res.json({ data: await service.get(req.user!.organizationId, idSchema.parse(req.params.id)) }); }
export async function paySale(req: AuthRequest, res: Response) { res.status(201).json({ data: await service.pay(req.user!.organizationId, req.user!.id, idSchema.parse(req.params.id), paymentSchema.parse(req.body)) }); }
export async function cancelSale(req: AuthRequest, res: Response) { res.json({ data: await service.cancel(req.user!.organizationId, req.user!.id, idSchema.parse(req.params.id)) }); }

import { ConflictError, NotFoundError } from '../../shared/errors.ts';
import { CatalogRepository } from './catalog.repository.ts';
export class CatalogService {
  constructor(private repo = new CatalogRepository()) {}
  products(org: string, page: number, limit: number, search: string) { return this.repo.listProducts(org, page, limit, search); }
  async createProduct(org: string, input: Parameters<CatalogRepository['createProduct']>[1]) { try { return await this.repo.createProduct(org, input); } catch (e) { if ((e as { code?: string }).code === '23505') throw new ConflictError('El SKU ya existe'); throw e; } }
  async updateProduct(org: string, id: string, input: Parameters<CatalogRepository['updateProduct']>[2]) { const row = await this.repo.updateProduct(org, id, input); if (!row) throw new NotFoundError('Producto'); return row; }
  customers(org: string, page: number, limit: number, search: string) { return this.repo.listCustomers(org, page, limit, search); }
  createCustomer(org: string, input: Parameters<CatalogRepository['createCustomer']>[1]) { return this.repo.createCustomer(org, input); }
  async updateCustomer(org: string, id: string, input: Parameters<CatalogRepository['updateCustomer']>[2]) { const row = await this.repo.updateCustomer(org, id, input); if (!row) throw new NotFoundError('Cliente'); return row; }
  units(org: string) { return this.repo.listUnits(org); } createUnit(org: string, input: Parameters<CatalogRepository['createUnit']>[1]) { return this.repo.createUnit(org, input); }
  categories(org: string) { return this.repo.listCategories(org); } createCategory(org: string, input: Parameters<CatalogRepository['createCategory']>[1]) { return this.repo.createCategory(org, input); }
  warehouses(org: string) { return this.repo.listWarehouses(org); } createWarehouse(org: string, input: Parameters<CatalogRepository['createWarehouse']>[1]) { return this.repo.createWarehouse(org, input); }
  stock(org: string, warehouse?: string) { return this.repo.listStock(org, warehouse); }
}

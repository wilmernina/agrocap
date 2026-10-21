import { ReportesRepository } from './reportes.repository.ts';
export class ReportesService { constructor(private readonly repository = new ReportesRepository()) {} ventasPeriodo(org: string, desde: Date, hasta: Date) { return this.repository.ventasPeriodo(org, desde, hasta); } productosMasVendidos(org: string, limite: number, desde?: Date, hasta?: Date) { return this.repository.productosMasVendidos(org, limite, desde, hasta); } stockValorizado(org: string) { return this.repository.stockValorizado(org); } kardex(org: string, productoId: string, desde?: Date, hasta?: Date, almacenId?: string) { return this.repository.kardex(org, productoId, desde, hasta, almacenId); }
  superficiePorCultivo(org: string, fincaId?: string) { return this.repository.superficiePorCultivo(org, fincaId); }
  actividadesPorParcela(org: string, desde?: Date, hasta?: Date, fincaId?: string) { return this.repository.actividadesPorParcela(org, desde, hasta, fincaId); }
  costosPorParcela(org: string, desde?: Date, hasta?: Date, fincaId?: string) { return this.repository.costosPorParcela(org, desde, hasta, fincaId); }
  productividadPorCultivo(org: string, desde?: Date, hasta?: Date) { return this.repository.productividadPorCultivo(org, desde, hasta); }
  kardexParcela(org: string, parcelaId: string, desde?: Date, hasta?: Date) { return this.repository.kardexParcela(org, parcelaId, desde, hasta); }
}

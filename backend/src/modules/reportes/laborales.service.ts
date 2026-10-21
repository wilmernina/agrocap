import { ReportesLaboralesRepository } from './laborales.repository.ts';

export class ReportesLaboralesService {
  constructor(private readonly repository = new ReportesLaboralesRepository()) {}
  planillasMensual(org: string, gestion: number, mes: number) { return this.repository.planillasMensual(org, gestion, mes); }
  costosPersonalPorParcela(org: string, desde?: string, hasta?: string) { return this.repository.costosPersonalPorParcela(org, desde, hasta); }
  antiguedadEmpleados(org: string) { return this.repository.antiguedadEmpleados(org); }
  provisiones(org: string, gestion: number) { return this.repository.provisiones(org, gestion); }
  aportesAfp(org: string, gestion: number, mes: number) { return this.repository.aportesAfp(org, gestion, mes); }
  rcIvaEmpleados(org: string, gestion: number, mes: number) { return this.repository.rcIvaEmpleados(org, gestion, mes); }
  libroMayoresManoObra(org: string, gestion?: number) { return this.repository.libroMayoresManoObra(org, gestion); }
}

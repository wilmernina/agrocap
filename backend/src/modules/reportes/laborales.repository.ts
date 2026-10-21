import { sql } from 'drizzle-orm';
import { db } from '../../db/index.ts';

export class ReportesLaboralesRepository {
  async planillasMensual(org: string, gestion: number, mes: number) {
    const resultado = await db.execute(sql`select pp.id as "periodoId",pp.tipo,pp.gestion,pp.mes,pp.quincena,pp.estado as "estadoPeriodo",
      e.id as "empleadoId",e.codigo,e.ci,e.nombres,e.apellidos,e.cargo,p.dias_trabajados as "diasTrabajados",
      p.monto_ganado as "montoGanado",p.horas_extra_monto as "horasExtra",p.bono_antiguedad as "bonoAntiguedad",
      p.bono_produccion as "bonoProduccion",p.otros_bonos as "otrosBonos",p.total_ganado as "totalGanado",
      p.aporte_afp as "aporteAfp",p.aporte_afp_comision as "comisionAfp",p.rc_iva as "rcIva",p.aporte_solidario as "aporteSolidario",
      p.total_descuentos as "totalDescuentos",p.liquido_pagable as "liquidoPagable",p.estado,p.fecha_pago as "fechaPago",p.metodo_pago as "metodoPago"
      from planillas p join periodos_planilla pp on pp.id=p.periodo_id join empleados e on e.id=p.empleado_id
      where p.organizacion_id=${org} and pp.organizacion_id=${org} and e.organizacion_id=${org}
      and pp.gestion=${gestion} and pp.mes=${mes} and p.estado<>'anulado'
      order by pp.tipo,pp.quincena,e.apellidos,e.nombres`);
    const detalle = resultado.rows;
    const resumen = detalle.reduce<{ planillas: number; totalGanado: number; totalDescuentos: number; liquidoPagable: number }>((r, f) => ({ planillas: r.planillas + 1, totalGanado: r.totalGanado + Number(f.totalGanado), totalDescuentos: r.totalDescuentos + Number(f.totalDescuentos), liquidoPagable: r.liquidoPagable + Number(f.liquidoPagable) }), { planillas: 0, totalGanado: 0, totalDescuentos: 0, liquidoPagable: 0 });
    return { gestion, mes, resumen, detalle };
  }

  costosPersonalPorParcela(org: string, desde?: string, hasta?: string) {
    return db.execute(sql`with asistencia as (
        select a.parcela_id, count(*)::int as "diasPersona", count(distinct a.empleado_id)::int as "empleados",
          coalesce(sum(case when e.tipo_pago='destajo' then 0 else coalesce(pp.monto_dia,case when e.tipo_pago='jornal' then e.valor_jornal else e.salario_base/30 end) end),0)::numeric(14,2) as "costoAsistencia"
        from asistencias a join empleados e on e.id=a.empleado_id and e.organizacion_id=${org}
        left join lateral (
          select (p.monto_ganado/nullif(p.dias_trabajados,0))::numeric as monto_dia
          from planillas p join periodos_planilla pp on pp.id=p.periodo_id and pp.organizacion_id=${org}
          where p.organizacion_id=${org} and p.empleado_id=a.empleado_id and p.estado<>'anulado'
            and a.fecha between pp.fecha_inicio and pp.fecha_fin
          order by (pp.fecha_fin-pp.fecha_inicio) asc limit 1
        ) pp on true
        where a.organizacion_id=${org} and a.parcela_id is not null and a.tipo in ('normal','feriado','domingo')
          and (${desde ?? null}::date is null or a.fecha>=${desde ?? null}::date)
          and (${hasta ?? null}::date is null or a.fecha<=${hasta ?? null}::date)
        group by a.parcela_id
      ), tareo as (
        select t.parcela_id,coalesce(sum(t.subtotal),0)::numeric(14,2) as "costoTareos"
        from tareos t where t.organizacion_id=${org} and t.parcela_id is not null and t.estado in ('aprobado','pagado')
          and (${desde ?? null}::date is null or t.fecha>=${desde ?? null}::date)
          and (${hasta ?? null}::date is null or t.fecha<=${hasta ?? null}::date)
        group by t.parcela_id
      )
      select p.id as "parcelaId",p.codigo,p.nombre as parcela,f.id as "fincaId",f.nombre as finca,
        coalesce(a."diasPersona",0)::int as "diasPersona",coalesce(a.empleados,0)::int as empleados,
        coalesce(a."costoAsistencia",0)::numeric(14,2) as "costoAsistencia",
        coalesce(t."costoTareos",0)::numeric(14,2) as "costoTareos",
        (coalesce(a."costoAsistencia",0)+coalesce(t."costoTareos",0))::numeric(14,2) as "costoTotal"
      from parcelas p join fincas f on f.id=p.finca_id and f.organizacion_id=${org}
      left join asistencia a on a.parcela_id=p.id left join tareo t on t.parcela_id=p.id
      where p.organizacion_id=${org} and p.activo=true and (a.parcela_id is not null or t.parcela_id is not null)
      order by "costoTotal" desc`);
  }

  antiguedadEmpleados(org: string) {
    return db.execute(sql`select id as "empleadoId",codigo,ci,nombres,apellidos,cargo,estado,fecha_ingreso as "fechaIngreso",fecha_baja as "fechaBaja",
      greatest(0,date_part('year',age(coalesce(fecha_baja,current_date),fecha_ingreso)))::int as "aniosCompletos",
      greatest(0,(current_date-coalesce(fecha_baja,current_date+1)))::int as "diasDesdeBaja"
      from empleados where organizacion_id=${org} order by fecha_ingreso,apellidos,nombres`);
  }

  provisiones(org: string, gestion: number) {
    return db.execute(sql`with devengado as (
        select p.empleado_id,coalesce(sum(p.total_ganado),0)::numeric(14,2) as "salarioDevengado"
        from planillas p join periodos_planilla pp on pp.id=p.periodo_id and pp.organizacion_id=${org}
        where p.organizacion_id=${org} and pp.gestion=${gestion} and p.estado<>'anulado' group by p.empleado_id
      )
      select e.id as "empleadoId",e.codigo,e.ci,e.nombres,e.apellidos,e.estado,e.fecha_ingreso as "fechaIngreso",e.fecha_baja as "fechaBaja",
        coalesce(d."salarioDevengado",0)::numeric(14,2) as "salarioDevengadoGestion",
        (coalesce(d."salarioDevengado",0)/12)::numeric(14,2) as "provisionAguinaldo",
        (e.salario_base*greatest(0,(least(coalesce(e.fecha_baja,make_date(${gestion},12,31)),make_date(${gestion},12,31))-greatest(e.fecha_ingreso,make_date(${gestion},1,1))+1)::numeric/360))::numeric(14,2) as "provisionIndemnizacionGestion",
        (e.salario_base*greatest(0,(coalesce(e.fecha_baja,make_date(${gestion},12,31))-e.fecha_ingreso+1)::numeric/360))::numeric(14,2) as "indemnizacionAcumuladaReferencial"
      from empleados e left join devengado d on d.empleado_id=e.id where e.organizacion_id=${org}
      order by e.apellidos,e.nombres`);
  }

  aportesAfp(org: string, gestion: number, mes: number) {
    return db.execute(sql`select pp.id as "periodoId",pp.tipo,pp.quincena,e.id as "empleadoId",e.codigo,e.ci,e.nombres,e.apellidos,e.afp,e.numero_afp as "numeroAfp",
      p.total_ganado as "totalGanado",p.aporte_afp as "aporteLaboral",p.aporte_afp_comision as comision,
      (p.total_ganado*cl.aporte_afp_patronal/100)::numeric(14,2) as "aportePatronal",
      (p.aporte_afp+p.total_ganado*cl.aporte_afp_patronal/100)::numeric(14,2) as "totalAportes"
      from planillas p join periodos_planilla pp on pp.id=p.periodo_id join empleados e on e.id=p.empleado_id
      join configuracion_laboral cl on cl.organizacion_id=pp.organizacion_id and cl.gestion=pp.gestion and cl.activo=true
      where p.organizacion_id=${org} and pp.gestion=${gestion} and pp.mes=${mes} and p.estado<>'anulado'
      order by e.apellidos,e.nombres,pp.tipo,pp.quincena`);
  }

  rcIvaEmpleados(org: string, gestion: number, mes: number) {
    return db.execute(sql`select pp.id as "periodoId",pp.tipo,pp.quincena,e.id as "empleadoId",e.codigo,e.ci,e.nombres,e.apellidos,
      p.total_ganado as "montoImponible",p.rc_iva as "rcIvaRetenido",coalesce(sum(fr.monto),0)::numeric(14,2) as "facturasPresentadas",
      count(fr.id)::int as "cantidadFacturas"
      from planillas p join periodos_planilla pp on pp.id=p.periodo_id join empleados e on e.id=p.empleado_id
      left join facturas_rc_iva fr on fr.planilla_id=p.id and fr.organizacion_id=${org}
      where p.organizacion_id=${org} and pp.gestion=${gestion} and pp.mes=${mes} and p.estado<>'anulado'
      group by pp.id,pp.tipo,pp.quincena,e.id,p.id order by e.apellidos,e.nombres,pp.tipo,pp.quincena`);
  }

  libroMayoresManoObra(org: string, gestion?: number) {
    return db.execute(sql`select pp.gestion,pp.mes,pp.tipo,pp.quincena,
      count(p.id)::int as "cantidadPlanillas",sum(p.total_ganado)::numeric(14,2) as "remuneracionesDevengadas",
      sum(p.aporte_afp)::numeric(14,2) as "aportesLaboralesRetenidos",
      sum(p.total_ganado*cl.aporte_afp_patronal/100)::numeric(14,2) as "aportesPatronales",
      sum(p.total_ganado+p.total_ganado*cl.aporte_afp_patronal/100)::numeric(14,2) as "costoLaboralTotal",
      sum(case when p.estado='pagado' then p.liquido_pagable else 0 end)::numeric(14,2) as "liquidoPagado"
      from planillas p join periodos_planilla pp on pp.id=p.periodo_id
      join configuracion_laboral cl on cl.organizacion_id=pp.organizacion_id and cl.gestion=pp.gestion and cl.activo=true
      where p.organizacion_id=${org} and p.estado<>'anulado' and (${gestion ?? null}::int is null or pp.gestion=${gestion ?? null})
      group by pp.gestion,pp.mes,pp.tipo,pp.quincena order by pp.gestion,pp.mes,pp.tipo,pp.quincena`);
  }
}

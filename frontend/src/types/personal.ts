export type CargoEmpleado = 'capataz'|'peon'|'tecnico'|'chofer'|'administrativo'|'otro';
export type Empleado = {
  id:string; usuarioId:string|null; codigo:string; nombres:string; apellidos:string; ci:string; ciComplemento:string|null;
  fechaNacimiento:string|null; genero:string|null; telefono:string|null; email:string|null; direccion:string|null; ciudad:string|null;
  cargo:CargoEmpleado; cargoId:string|null; tipoContrato:'permanente'|'eventual'|'temporal'; fechaIngreso:string; fechaBaja:string|null; motivoBaja:string|null;
  salarioBase:string; tipoPago:'mensual'|'jornal'|'destajo'; valorJornal:string|null; banco:string|null; numeroCuenta:string|null;
  afp:string|null; numeroAfp:string|null; tieneRcIva:boolean; estado:'activo'|'inactivo'|'vacacion'|'licencia'; observaciones:string|null;
  edad:number|null; createdAt:string; updatedAt:string;
};
export type EmpleadoInput = Omit<Empleado,'id'|'edad'|'createdAt'|'updatedAt'>;
export type Cargo = {id:string;nombre:string;descripcion:string|null;salarioBaseReferencia:string;activo:boolean};
export type ConfiguracionLaboral = {
  id:string;gestion:number;salarioMinimoNacional:string;aporteAfpLaboral:string;aporteAfpPatronal:string;comisionAfp:string;tasaRcIva:string;
  umbralAporteSolidario:string;porcentajeAporteSolidario:Array<{desde:string|number;hasta:string|number|null;porcentaje:string|number}>;
  horasMesBase:number;diasMesBase:number;recargoHoraExtra:string;recargoNocturno:string;recargoDominical:string;activo:boolean;fuenteNormativa:string|null;
};
export type ConfiguracionInput = Omit<ConfiguracionLaboral,'id'>;
export type PeriodoPlanilla = {id:string;gestion:number;mes:number;quincena:number|null;tipo:'mensual'|'quincenal';fechaInicio:string;fechaFin:string;fechaPago:string|null;estado:'abierto'|'calculado'|'cerrado'|'pagado'};
export type Planilla = {id:string;periodoId:string;empleadoId:string;salarioBase:string;diasTrabajados:string;montoGanado:string;horasExtraMonto:string;bonoAntiguedad:string;bonoProduccion:string;otrosBonos:unknown;totalGanado:string;aporteAfp:string;aporteAfpComision:string;rcIva:string;aporteSolidario:string;otrosDescuentos:unknown;totalDescuentos:string;liquidoPagable:string;estado:'calculado'|'pagado'|'anulado';fechaPago:string|null;metodoPago:string|null;referenciaPago:string|null;observaciones:string|null};
export type PeriodoDetalle = PeriodoPlanilla & {planillas:{planilla:Planilla;empleado:Empleado}[]};
export type DetallePlanilla = {planilla:Planilla;empleado:Empleado;periodo:PeriodoPlanilla;conceptos:{id:string;tipo:'ingreso'|'descuento';concepto:string;monto:string;orden:number}[];facturas:unknown[];boleta:{numeroBoleta:string}|null};
export type FacturaRcIva = {id:string;planillaId:string;empleadoId:string;numeroFactura:string;nitProveedor:string|null;razonSocial:string|null;monto:string;fecha:string;tipo:'compras'|'servicios'|'alquiler'};
export type Feriado = {id:string;fecha:string;nombre:string;tipo:'nacional'|'departamental'|'regional';departamento:string|null;activo:boolean};
export type FilaPlanillaMensual = {empleadoId:string;codigo:string;ci:string;nombres:string;apellidos:string;cargo:string;diasTrabajados:string;totalGanado:string;totalDescuentos:string;liquidoPagable:string;estado:string};
export type ReportePlanillaMensual = {gestion:number;mes:number;resumen:{planillas:number;totalGanado:number;totalDescuentos:number;liquidoPagable:number};detalle:FilaPlanillaMensual[]};

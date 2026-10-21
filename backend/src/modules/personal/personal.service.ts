import { addDays, differenceInCalendarDays, differenceInYears, parseISO } from 'date-fns';
import { AppError, ConflictError, NotFoundError } from '../../shared/errors.ts';
import type { ContextoAuditoria } from '../../shared/auditoria.ts';
import { PersonalRepository } from './personal.repository.ts';
import type { ActualizarEmpleadoInput, CargoInput, ConfiguracionInput, ConsultaEmpleados, EmpleadoInput, FeriadoInput } from './personal.schemas.ts';

const redondear = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const fechaLocalISO = (fecha: Date) => new Date(Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate())).toISOString().slice(0, 10);

function fechaPascua(gestion: number) {
  const a = gestion % 19, b = Math.floor(gestion / 100), c = gestion % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1;
  return parseISO(`${gestion}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`);
}

export class PersonalService {
  constructor(private readonly repo = new PersonalRepository()) {}
  private async existe<T>(valor: T | undefined, nombre: string): Promise<T> { if (!valor) throw new NotFoundError(nombre); return valor; }
  private async conErrores<T>(accion: () => Promise<T>): Promise<T> { try { return await accion(); } catch (error) { const codigo = (error as { code?: string }).code; if (codigo === '23505') throw new ConflictError('Ya existe un registro con ese código, CI o nombre'); if (codigo === '23503') throw new AppError(422, 'La referencia seleccionada no existe o pertenece a otra organización', 'REFERENCIA_INVALIDA'); throw error; } }
  private edad(fechaNacimiento: string | null, referencia = new Date()) { return fechaNacimiento ? differenceInYears(referencia, parseISO(fechaNacimiento)) : null; }
  private sueldoMensual(empleado: { salarioBase: string; tipoPago: string; valorJornal: string | null }) { return empleado.tipoPago === 'jornal' ? Number(empleado.valorJornal ?? 0) * 30 : Number(empleado.salarioBase); }

  async listarEmpleados(org: string, q: ConsultaEmpleados) { const r = await this.repo.listarEmpleados(org, q); return { ...r, data: r.data.map(e => ({ ...e, edad: this.edad(e.fechaNacimiento) })) }; }
  async obtenerEmpleado(org: string, id: string) { const e = await this.existe(await this.repo.obtenerEmpleado(org, id), 'Empleado'); return { ...e, edad: this.edad(e.fechaNacimiento), ...(await this.repo.historialEmpleado(org, id)) }; }
  async crearEmpleado(datos: EmpleadoInput, ctx: ContextoAuditoria) {
    if (datos.fechaNacimiento && parseISO(datos.fechaNacimiento) >= new Date()) throw new AppError(422, 'La fecha de nacimiento debe ser anterior a hoy', 'FECHA_NACIMIENTO_INVALIDA');
    if (parseISO(datos.fechaIngreso) < (datos.fechaNacimiento ? parseISO(datos.fechaNacimiento) : new Date('1900-01-01'))) throw new AppError(422, 'La fecha de ingreso no puede ser anterior al nacimiento', 'FECHAS_INVALIDAS');
    if (datos.usuarioId && !await this.repo.usuarioPertenece(ctx.organizacionId, datos.usuarioId)) throw new AppError(422, 'El usuario debe estar activo y pertenecer a la organización', 'USUARIO_INVALIDO');
    if (datos.cargoId && !await this.repo.cargoPertenece(ctx.organizacionId, datos.cargoId)) throw new AppError(422, 'El cargo seleccionado no está activo en la organización', 'CARGO_INVALIDO');
    const e = await this.conErrores(() => this.repo.crearEmpleado(datos, ctx)); return { ...e, edad: this.edad(e.fechaNacimiento) };
  }
  async actualizarEmpleado(org: string, id: string, datos: ActualizarEmpleadoInput, ctx: ContextoAuditoria) {
    const actual = await this.existe(await this.repo.obtenerEmpleado(org, id), 'Empleado');
    const nacimiento = datos.fechaNacimiento === undefined ? actual.fechaNacimiento : datos.fechaNacimiento;
    const ingreso = datos.fechaIngreso ?? actual.fechaIngreso;
    if (nacimiento && parseISO(nacimiento) >= new Date()) throw new AppError(422, 'La fecha de nacimiento debe ser anterior a hoy', 'FECHA_NACIMIENTO_INVALIDA');
    if (nacimiento && parseISO(ingreso) < parseISO(nacimiento)) throw new AppError(422, 'La fecha de ingreso no puede ser anterior al nacimiento', 'FECHAS_INVALIDAS');
    if (datos.usuarioId && !await this.repo.usuarioPertenece(org, datos.usuarioId)) throw new AppError(422, 'El usuario debe estar activo y pertenecer a la organización', 'USUARIO_INVALIDO');
    if (datos.cargoId && !await this.repo.cargoPertenece(org, datos.cargoId)) throw new AppError(422, 'El cargo seleccionado no está activo en la organización', 'CARGO_INVALIDO');
    const e = await this.conErrores(() => this.repo.actualizarEmpleado(id, datos, ctx)); const row = await this.existe(e, 'Empleado'); return { ...row, edad: this.edad(row.fechaNacimiento) };
  }
  async desactivarEmpleado(org: string, id: string, ctx: ContextoAuditoria) {
    await this.existe(await this.repo.obtenerEmpleado(org, id), 'Empleado');
    if (await this.repo.tienePlanillas(org, id)) throw new ConflictError('No se puede eliminar un empleado con planillas; registre su baja para conservar el historial');
    return this.existe(await this.repo.desactivarEmpleado(id, ctx), 'Empleado');
  }
  async darDeBaja(org: string, id: string, fechaBaja: string, motivoBaja: string, ctx: ContextoAuditoria) {
    const empleado = await this.existe(await this.repo.obtenerEmpleado(org, id), 'Empleado');
    if (empleado.fechaBaja) throw new ConflictError('El empleado ya tiene una baja registrada');
    const inicio = parseISO(empleado.fechaIngreso), fin = parseISO(fechaBaja);
    if (fin < inicio) throw new AppError(422, 'La fecha de baja no puede ser anterior al ingreso', 'FECHAS_INVALIDAS');
    const dias = differenceInCalendarDays(fin, inicio) + 1;
    const sueldos = await this.repo.salariosTresMesesCompletos(org, id, fechaBaja);
    const hayTresMeses = sueldos.length === 3;
    const base = hayTresMeses ? sueldos.reduce((s, fila) => s + Number(fila.ganado ?? 0), 0) / 3 : this.sueldoMensual(empleado);
    const elegible = dias > 90;
    const indemnizacion = elegible ? redondear(base * dias / 360) : 0;
    const actualizado = await this.conErrores(() => this.repo.darDeBaja(id, fechaBaja, motivoBaja, ctx));
    if (!actualizado) throw new NotFoundError('Empleado');
    return { empleado: actualizado.empleado, liquidacionReferencial: { diasServicio: dias, añosServicio: redondear(dias / 360), salarioBaseIndemnizacion: redondear(base), fuenteBase: hayTresMeses ? 'promedio de los tres meses completos anteriores, tomados de planillas' : 'salario mensual registrado; faltan planillas de tres meses completos', elegiblePorAntiguedad: elegible, indemnizacionEstimada: indemnizacion, nota: 'Estimación orientativa. La indemnización requiere más de 90 días continuos y se calcula sobre el promedio salarial indemnizable; validar causal, componentes salariales y beneficios aplicables con el contador.' } };
  }
  async beneficiosEmpleado(org: string, id: string, fechaTexto?: string) {
    const empleado = await this.existe(await this.repo.obtenerEmpleado(org, id), 'Empleado');
    const fecha = fechaTexto ? parseISO(fechaTexto) : new Date();
    if (fecha < parseISO(empleado.fechaIngreso)) throw new AppError(422, 'La fecha de consulta es anterior al ingreso', 'FECHAS_INVALIDAS');
    const diasServicio = differenceInCalendarDays(fecha, parseISO(empleado.fechaIngreso)) + 1;
    const añosCumplidos = differenceInYears(fecha, parseISO(empleado.fechaIngreso));
    return { empleadoId: id, fecha: fechaTexto ?? fechaLocalISO(fecha), antiguedad: { dias: diasServicio, añosCumplidos }, vacaciones: { diasPorAño: 15, añosConDerecho: Math.max(0, añosCumplidos), diasGeneradosReferenciales: Math.max(0, añosCumplidos) * 15, nota: 'No descuenta vacaciones tomadas porque aún no existe un registro de saldos/licencias.' } };
  }
  async boletasEmpleado(org: string, id: string) { await this.existe(await this.repo.obtenerEmpleado(org, id), 'Empleado'); return this.repo.boletasEmpleado(org, id); }

  listarCargos(org: string, activo?: boolean) { return this.repo.listarCargos(org, activo); }
  obtenerCargo(org: string, id: string) { return this.existe(this.repo.obtenerCargo(org, id), 'Cargo'); }
  crearCargo(datos: CargoInput, ctx: ContextoAuditoria) { return this.conErrores(() => this.repo.crearCargo(datos, ctx)); }
  async actualizarCargo(org: string, id: string, datos: Partial<CargoInput>, ctx: ContextoAuditoria) { await this.existe(await this.repo.obtenerCargo(org, id), 'Cargo'); return this.existe(await this.conErrores(() => this.repo.actualizarCargo(id, datos, ctx)), 'Cargo'); }
  async desactivarCargo(org: string, id: string, ctx: ContextoAuditoria) { await this.existe(await this.repo.obtenerCargo(org, id), 'Cargo'); return this.existe(await this.repo.desactivarCargo(id, ctx), 'Cargo'); }

  listarConfiguraciones(org: string) { return this.repo.listarConfiguracion(org); }
  async obtenerConfiguracion(org: string, gestion: number) { return this.existe(await this.repo.obtenerConfiguracion(org, gestion), 'Configuración laboral'); }
  crearConfiguracion(datos: ConfiguracionInput, ctx: ContextoAuditoria) { return this.conErrores(() => this.repo.crearConfiguracion(datos, ctx)); }
  async actualizarConfiguracion(org: string, gestion: number, datos: Partial<Omit<ConfiguracionInput, 'gestion'>>, ctx: ContextoAuditoria) { await this.obtenerConfiguracion(org, gestion); return this.existe(await this.conErrores(() => this.repo.actualizarConfiguracion(org, gestion, datos, ctx)), 'Configuración laboral'); }
  async desactivarConfiguracion(org: string, gestion: number, ctx: ContextoAuditoria) { await this.obtenerConfiguracion(org, gestion); return this.existe(await this.repo.desactivarConfiguracion(org, gestion, ctx), 'Configuración laboral'); }

  listarFeriados(org: string, q: { gestion?: number; departamento?: string; tipo?: FeriadoInput['tipo'] }) { return this.repo.listarFeriados(org, q.gestion, q.departamento, q.tipo); }
  async obtenerFeriado(org: string, id: string) { return this.existe(await this.repo.obtenerFeriado(org, id), 'Feriado'); }
  crearFeriado(datos: FeriadoInput, ctx: ContextoAuditoria) { return this.conErrores(() => this.repo.crearFeriado(datos, ctx)); }
  async actualizarFeriado(org: string, id: string, datos: Partial<FeriadoInput>, ctx: ContextoAuditoria) { await this.obtenerFeriado(org, id); return this.existe(await this.conErrores(() => this.repo.actualizarFeriado(id, datos, ctx)), 'Feriado'); }
  async desactivarFeriado(org: string, id: string, ctx: ContextoAuditoria) { await this.obtenerFeriado(org, id); return this.existe(await this.repo.desactivarFeriado(id, ctx), 'Feriado'); }
  async precargarFeriados(org: string, gestion: number, ctx: ContextoAuditoria) {
    const pascua = fechaPascua(gestion);
    const nacionales: FeriadoInput[] = [
      [`${gestion}-01-01`, 'Año Nuevo'], [`${gestion}-01-22`, 'Día de la Creación del Estado Plurinacional'],
      [fechaLocalISO(addDays(pascua, -3)), 'Lunes de Carnaval'], [fechaLocalISO(addDays(pascua, -2)), 'Martes de Carnaval'],
      [fechaLocalISO(addDays(pascua, -2)), 'Viernes Santo'], [`${gestion}-05-01`, 'Día del Trabajo'], [fechaLocalISO(addDays(pascua, 60)), 'Corpus Christi'],
      [`${gestion}-06-21`, 'Año Nuevo Andino Amazónico Chaqueño'], [`${gestion}-08-06`, 'Día de la Independencia'], [`${gestion}-11-02`, 'Día de Todos los Difuntos'], [`${gestion}-12-25`, 'Navidad'],
    ].map(([f, nombre]) => ({ fecha: f, nombre, tipo: 'nacional' as const, departamento: null, activo: true }));
    // Carnaval precede al miércoles de ceniza por 48 y 47 días; se corrige con martes y lunes, respectivamente.
    nacionales[2].fecha = fechaLocalISO(addDays(pascua, -48));
    nacionales[3].fecha = fechaLocalISO(addDays(pascua, -47));
    const efemerides = [
      ['Oruro', '-02-10'], ['Tarija', '-04-15'], ['Chuquisaca', '-05-25'], ['La Paz', '-07-16'], ['Cochabamba', '-09-14'], ['Santa Cruz', '-09-24'], ['Pando', '-09-24'], ['Potosí', '-11-10'], ['Beni', '-11-18'],
    ].map(([departamento, mmdd]) => ({ fecha: `${gestion}${mmdd}`, nombre: `Efeméride de ${departamento}`, tipo: 'departamental' as const, departamento, activo: true }));
    const excepcionales: FeriadoInput[] = gestion === 2025 ? [{ fecha: '2025-08-07', nombre: 'Feriado excepcional del Bicentenario (D.S. 5438)', tipo: 'nacional', departamento: null, activo: true }] : [];
    const insertados = await this.conErrores(() => this.repo.crearLoteFeriados([...nacionales, ...efemerides, ...excepcionales], ctx));
    return { gestion, creados: insertados.length, feriados: await this.listarFeriados(org, { gestion }) };
  }
  async aguinaldo(org: string, gestion: number) { const detalle = await this.repo.resumenAguinaldo(org, gestion); const total = detalle.reduce((s, e) => s + e.aguinaldoEstimado, 0); return { gestion, totalEstimado: redondear(total), detalle: detalle.map(e => ({ ...e, aguinaldoEstimado: redondear(e.aguinaldoEstimado) })) }; }
}

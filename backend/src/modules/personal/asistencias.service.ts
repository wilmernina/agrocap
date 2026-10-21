import { addDays, differenceInMinutes, parseISO } from 'date-fns';
import { AppError, ConflictError, NotFoundError } from '../../shared/errors.ts';
import type { ContextoAuditoria } from '../../shared/auditoria.ts';
import { AsistenciasRepository, type AsistenciaCalculada } from './asistencias.repository.ts';
import type { ActualizarAsistenciaInput, AsistenciaInput, ConsultaAsistencia } from './asistencias.schemas.ts';

const redondear = (n: number) => (Math.round((n + Number.EPSILON) * 100) / 100).toFixed(2);
const minutosHora = (hora: string) => { const [h, m, s = '0'] = hora.split(':'); return Number(h) * 60 + Number(m) + Number(s) / 60; };
const formatearHora = (hora: string) => hora.length === 5 ? `${hora}:00` : hora;
const departamentoPorCiudad: Record<string, string> = { sucre: 'Chuquisaca', 'la paz': 'La Paz', elalto: 'La Paz', 'el alto': 'La Paz', cochabamba: 'Cochabamba', oruro: 'Oruro', potosi: 'Potosí', 'potosí': 'Potosí', tarija: 'Tarija', 'santa cruz': 'Santa Cruz', trinidad: 'Beni', cobija: 'Pando' };

function datosBolivia() {
  const hoy = new Date();
  const fecha = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/La_Paz', year: 'numeric', month: '2-digit', day: '2-digit' }).format(hoy);
  const hora = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/La_Paz', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).format(hoy);
  return { fecha, hora };
}

export class AsistenciasService {
  constructor(private readonly repo = new AsistenciasRepository()) {}
  private async empleado(org: string, id: string) { const e = await this.repo.empleado(org, id); if (!e) throw new NotFoundError('Empleado'); if (e.estado === 'inactivo') throw new ConflictError('No se puede registrar asistencia para un empleado inactivo'); return e; }
  private async validarReferencias(org: string, dato: AsistenciaInput) {
    if (dato.parcelaId && !await this.repo.parcelaValida(org, dato.parcelaId)) throw new AppError(422, 'La parcela no existe o está inactiva', 'PARCELA_INVALIDA');
    if (dato.actividadId) {
      const actividad = await this.repo.actividad(org, dato.actividadId);
      if (!actividad) throw new AppError(422, 'La actividad de campo no existe', 'ACTIVIDAD_INVALIDA');
      if (dato.parcelaId && actividad.parcelaId !== dato.parcelaId) throw new AppError(422, 'La actividad no corresponde a la parcela seleccionada', 'ACTIVIDAD_PARCELA_INVALIDA');
    }
  }
  private async calcular(org: string, dato: AsistenciaInput, empleado: Awaited<ReturnType<AsistenciasRepository['empleado']>>): Promise<AsistenciaCalculada> {
    if (!empleado) throw new NotFoundError('Empleado');
    await this.validarReferencias(org, dato);
    const tipoExplicito = dato.tipo;
    const sinJornada = ['licencia', 'vacacion', 'falta', 'permiso'].includes(tipoExplicito ?? '');
    if (sinJornada && (dato.horaEntrada || dato.horaSalida)) throw new AppError(422, 'Una falta, licencia, permiso o vacación no debe llevar marcas horarias', 'MARCAS_INVALIDAS');
    if (dato.horaSalida && !dato.horaEntrada) throw new AppError(422, 'Debe registrar la entrada antes de la salida', 'SALIDA_SIN_ENTRADA');
    let horas = 0, extras = 0, nocturnas = 0;
    if (dato.horaEntrada && dato.horaSalida) {
      const inicio = parseISO(`${dato.fecha}T${formatearHora(dato.horaEntrada)}`);
      let fin = parseISO(`${dato.fecha}T${formatearHora(dato.horaSalida)}`);
      if (fin <= inicio) fin = addDays(fin, 1);
      const minutos = differenceInMinutes(fin, inicio);
      if (minutos > 18 * 60) throw new AppError(422, 'La jornada no puede superar 18 horas', 'JORNADA_INVALIDA');
      horas = minutos / 60;
      const config = await this.repo.config(org, Number(dato.fecha.slice(0, 4)));
      const horasNormales = Number(config?.horasMesBase ?? 240) / Number(config?.diasMesBase ?? 30);
      extras = Math.max(0, horas - horasNormales);
      const start = minutosHora(dato.horaEntrada), end = start + minutos;
      let minutosNocturnos = 0;
      for (let dia = 0; dia <= Math.floor(end / 1440); dia++) {
        for (const [a, b] of [[0, 360], [1260, 1440]]) {
          const desde = dia * 1440 + a, hasta = dia * 1440 + b;
          minutosNocturnos += Math.max(0, Math.min(end, hasta) - Math.max(start, desde));
        }
      }
      nocturnas = Math.min(extras, minutosNocturnos / 60);
    }
    let tipo: AsistenciaCalculada['tipo'] = tipoExplicito ?? 'normal';
    if (!sinJornada) {
      const feriados = await this.repo.feriadosFecha(org, dato.fecha);
      const departamento = empleado.ciudad ? departamentoPorCiudad[empleado.ciudad.trim().toLocaleLowerCase('es-BO')] : undefined;
      const esFeriado = feriados.some(f => f.tipo === 'nacional' || !f.departamento || f.departamento === departamento);
      const domingo = parseISO(dato.fecha).getDay() === 0;
      if (esFeriado || tipoExplicito === 'feriado') tipo = 'feriado';
      else if (domingo || tipoExplicito === 'domingo') tipo = 'domingo';
      else tipo = 'normal';
    }
    return { ...dato, horaEntrada: dato.horaEntrada ? formatearHora(dato.horaEntrada) : null, horaSalida: dato.horaSalida ? formatearHora(dato.horaSalida) : null, tipo, horasTrabajadas: redondear(horas), horasExtra: redondear(extras - nocturnas), horasExtraNocturnas: redondear(nocturnas) };
  }
  listar(org: string, q: ConsultaAsistencia) { return this.repo.listar(org, q); }
  porFecha(org: string, fecha: string) { return this.repo.porFecha(org, fecha); }
  async obtener(org: string, id: string) { const fila = await this.repo.obtener(org, id); if (!fila) throw new NotFoundError('Asistencia'); return fila; }
  async crearLote(datos: AsistenciaInput[], ctx: ContextoAuditoria) { const filas: AsistenciaCalculada[] = []; for (const d of datos) filas.push(await this.calcular(ctx.organizacionId, d, await this.empleado(ctx.organizacionId, d.empleadoId))); try { return await this.repo.crearLote(filas, ctx); } catch (error) { if ((error as { code?: string }).code === '23505') throw new ConflictError('Ya existe una asistencia para uno de los empleados en esa fecha'); throw error; } }
  async actualizar(org: string, id: string, cambios: ActualizarAsistenciaInput, ctx: ContextoAuditoria) {
    const actual = await this.obtener(org, id);
    const { justificacion, ...cambiosAplicados } = cambios;
    const observaciones = [cambiosAplicados.observaciones ?? actual.asistencia.observaciones, `Corrección: ${justificacion}`].filter(Boolean).join('\n').slice(0, 2000);
    const entrada: AsistenciaInput = { empleadoId: actual.asistencia.empleadoId, fecha: actual.asistencia.fecha, horaEntrada: actual.asistencia.horaEntrada, horaSalida: actual.asistencia.horaSalida, tipo: actual.asistencia.tipo, parcelaId: actual.asistencia.parcelaId, actividadId: actual.asistencia.actividadId, observaciones, ...cambiosAplicados };
    const calculada = await this.calcular(org, entrada, actual.empleado);
    const row = await this.repo.actualizar(org, id, calculada, ctx); if (!row) throw new NotFoundError('Asistencia'); return row;
  }
  async marcar(org: string, datos: { empleadoId: string; codigoQr?: string; fecha?: string; hora?: string; parcelaId?: string | null; actividadId?: string | null; latitud?: number; longitud?: number; precisionGps?: number; observaciones?: string | null }, ctx: ContextoAuditoria) {
    const e = await this.empleado(org, datos.empleadoId);
    if (datos.codigoQr && !await this.repo.existeCodigoQr(org, e.id, datos.codigoQr)) throw new AppError(422, 'El código QR no corresponde al empleado', 'QR_INVALIDO');
    const hoy = datosBolivia(), fecha = datos.fecha ?? hoy.fecha, hora = datos.hora ?? hoy.hora;
    const actual = await this.repo.porEmpleadoFecha(org, e.id, fecha);
    if (!actual) {
      const entrada: AsistenciaInput = { empleadoId: e.id, fecha, horaEntrada: hora, parcelaId: datos.parcelaId ?? null, actividadId: datos.actividadId ?? null, latitudEntrada: datos.latitud?.toFixed(7), longitudEntrada: datos.longitud?.toFixed(7), precisionGpsEntrada: datos.precisionGps?.toFixed(2), observaciones: datos.observaciones ?? null };
      const [creada] = await this.crearLote([entrada], ctx); return { accion: 'entrada', asistencia: creada };
    }
    if (!actual.horaEntrada) {
      const entrada: AsistenciaInput = { empleadoId: e.id, fecha, horaEntrada: hora, horaSalida: actual.horaSalida, tipo: actual.tipo, parcelaId: datos.parcelaId ?? actual.parcelaId, actividadId: datos.actividadId ?? actual.actividadId, latitudEntrada: datos.latitud?.toFixed(7) ?? actual.latitudEntrada ?? undefined, longitudEntrada: datos.longitud?.toFixed(7) ?? actual.longitudEntrada ?? undefined, precisionGpsEntrada: datos.precisionGps?.toFixed(2) ?? actual.precisionGpsEntrada ?? undefined, observaciones: datos.observaciones ?? actual.observaciones };
      const calc = await this.calcular(org, entrada, e), row = await this.repo.actualizar(org, actual.id, calc, ctx); if (!row) throw new NotFoundError('Asistencia'); return { accion: 'entrada', asistencia: row };
    }
    if (actual.horaSalida) throw new ConflictError('La asistencia ya tiene entrada y salida registradas');
    const entrada: AsistenciaInput = { empleadoId: e.id, fecha, horaEntrada: actual.horaEntrada, horaSalida: hora, tipo: actual.tipo, parcelaId: datos.parcelaId ?? actual.parcelaId, actividadId: datos.actividadId ?? actual.actividadId, latitudEntrada: actual.latitudEntrada ?? undefined, longitudEntrada: actual.longitudEntrada ?? undefined, precisionGpsEntrada: actual.precisionGpsEntrada ?? undefined, latitudSalida: datos.latitud?.toFixed(7), longitudSalida: datos.longitud?.toFixed(7), precisionGpsSalida: datos.precisionGps?.toFixed(2), observaciones: datos.observaciones ?? actual.observaciones };
    const calc = await this.calcular(org, entrada, e), row = await this.repo.actualizar(org, actual.id, calc, ctx); if (!row) throw new NotFoundError('Asistencia'); return { accion: 'salida', asistencia: row };
  }
  resumen(org: string, mes: number, gestion: number) { return this.repo.resumen(org, mes, gestion); }
}

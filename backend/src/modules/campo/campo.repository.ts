import { and, asc, count, eq, ilike, or, sql } from 'drizzle-orm';
import { db } from '../../db/index.ts';
import { fincas, parcelas } from '../../db/schema-fase2.ts';
import { registrarAuditoria, type ContextoAuditoria } from '../../shared/auditoria.ts';
import { AppError } from '../../shared/errors.ts';
import type {
  ActualizarFincaInput, ActualizarLoteParcelaInput, ActualizarParcelaInput, ActualizarPuntoInteresInput,
  ConsultaFincas, ConsultaGeoJson, ConsultaParcelas, FincaInput, LoteParcelaInput, ParcelaInput, PuntoInteresInput,
} from './campo.schemas.ts';

const json = (valor: unknown) => JSON.stringify(valor);
const seleccionFinca = {
  id: fincas.id, nombre: fincas.nombre, propietarioId: fincas.propietarioId, direccion: fincas.direccion,
  municipio: fincas.municipio, departamento: fincas.departamento, superficieTotal: fincas.superficieTotal,
  activo: fincas.activo, createdAt: fincas.createdAt, updatedAt: fincas.updatedAt,
};

export class CampoRepository {
  async listarFincas(org: string, q: ConsultaFincas) {
    const filtro = and(eq(fincas.organizacionId, org), q.activo === undefined ? undefined : eq(fincas.activo, q.activo), q.busqueda ? or(ilike(fincas.nombre, `%${q.busqueda}%`), ilike(fincas.municipio, `%${q.busqueda}%`)) : undefined);
    const [data, total] = await Promise.all([
      db.select(seleccionFinca).from(fincas).where(filtro).orderBy(asc(fincas.nombre)).limit(q.limite).offset((q.pagina - 1) * q.limite),
      db.select({ valor: count() }).from(fincas).where(filtro),
    ]);
    return { data, total: total[0]?.valor ?? 0 };
  }

  async obtenerFinca(org: string, id: string) {
    const [fila] = await db.select(seleccionFinca).from(fincas).where(and(eq(fincas.organizacionId, org), eq(fincas.id, id))).limit(1);
    return fila;
  }

  crearFinca(datos: FincaInput, ctx: ContextoAuditoria) {
    return db.transaction(async (tx) => {
      if (datos.propietarioId) {
        const propietario = await tx.execute(sql`SELECT id FROM usuarios WHERE id=${datos.propietarioId} AND organizacion_id=${ctx.organizacionId} AND activo=true`);
        if (!propietario.rows[0]) throw new AppError(422, 'El propietario no existe o no pertenece a esta organización', 'PROPIETARIO_INVALIDO');
      }
      const [fila] = await tx.insert(fincas).values({ ...datos, organizacionId: ctx.organizacionId }).returning();
      await registrarAuditoria(tx, ctx, 'CREAR', 'fincas', fila.id, null, fila);
      return fila;
    });
  }

  actualizarFinca(id: string, datos: ActualizarFincaInput, ctx: ContextoAuditoria) {
    return db.transaction(async (tx) => {
      const [anterior] = await tx.select().from(fincas).where(and(eq(fincas.organizacionId, ctx.organizacionId), eq(fincas.id, id))).for('update');
      if (!anterior) return undefined;
      if (datos.propietarioId) {
        const propietario = await tx.execute(sql`SELECT id FROM usuarios WHERE id=${datos.propietarioId} AND organizacion_id=${ctx.organizacionId} AND activo=true`);
        if (!propietario.rows[0]) throw new AppError(422, 'El propietario no existe o no pertenece a esta organización', 'PROPIETARIO_INVALIDO');
      }
      const [fila] = await tx.update(fincas).set({ ...datos, updatedAt: new Date() }).where(eq(fincas.id, id)).returning();
      await registrarAuditoria(tx, ctx, 'ACTUALIZAR', 'fincas', id, anterior, fila);
      return fila;
    });
  }

  desactivarFinca(id: string, ctx: ContextoAuditoria) { return this.cambiarFinca(id, false, ctx); }
  private cambiarFinca(id: string, activo: boolean, ctx: ContextoAuditoria) {
    return db.transaction(async (tx) => {
      const [anterior] = await tx.select().from(fincas).where(and(eq(fincas.organizacionId, ctx.organizacionId), eq(fincas.id, id))).for('update');
      if (!anterior) return undefined;
      const [fila] = await tx.update(fincas).set({ activo, updatedAt: new Date() }).where(eq(fincas.id, id)).returning();
      await registrarAuditoria(tx, ctx, 'DESACTIVAR', 'fincas', id, anterior, fila);
      return fila;
    });
  }

  async listarParcelas(org: string, q: ConsultaParcelas) {
    const result = await db.execute(sql`
      SELECT p.id, p.finca_id AS "fincaId", p.nombre, p.codigo,
        ST_AsGeoJSON(p.geometria)::jsonb AS geometria,
        p.superficie_calculada AS "superficieCalculada", p.tipo_suelo AS "tipoSuelo", p.altitud, p.pendiente,
        p.sistema_riego AS "sistemaRiego", p.observaciones, p.activo, p.created_at AS "createdAt", p.updated_at AS "updatedAt",
        f.nombre AS finca,
        c.cultivo_id AS "cultivoActualId", cu.nombre_comun AS "cultivoActual"
      FROM parcelas p JOIN fincas f ON f.id=p.finca_id
      LEFT JOIN LATERAL (
        SELECT cc.cultivo_id FROM ciclos_cultivo cc
        WHERE cc.parcela_id=p.id AND cc.organizacion_id=p.organizacion_id AND cc.estado='en_curso'
        ORDER BY cc.fecha_siembra DESC LIMIT 1
      ) c ON true
      LEFT JOIN cultivos cu ON cu.id=c.cultivo_id AND cu.organizacion_id=p.organizacion_id
      WHERE p.organizacion_id=${org}
        AND (${q.activo === undefined} OR p.activo=${q.activo ?? false})
        AND (${q.finca ?? null}::uuid IS NULL OR p.finca_id=${q.finca ?? null}::uuid)
        AND (${q.cultivo_actual ?? null}::uuid IS NULL OR c.cultivo_id=${q.cultivo_actual ?? null}::uuid)
        AND (${q.busqueda === ''} OR p.nombre ILIKE ${`%${q.busqueda}%`} OR p.codigo ILIKE ${`%${q.busqueda}%`})
      ORDER BY p.nombre LIMIT ${q.limite} OFFSET ${(q.pagina - 1) * q.limite}
    `);
    const totalResult = await db.execute(sql`
      SELECT count(*)::int AS total FROM parcelas p
      WHERE p.organizacion_id=${org}
        AND (${q.activo === undefined} OR p.activo=${q.activo ?? false})
        AND (${q.finca ?? null}::uuid IS NULL OR p.finca_id=${q.finca ?? null}::uuid)
        AND (${q.cultivo_actual ?? null}::uuid IS NULL OR EXISTS (SELECT 1 FROM ciclos_cultivo cc WHERE cc.parcela_id=p.id AND cc.organizacion_id=p.organizacion_id AND cc.estado='en_curso' AND cc.cultivo_id=${q.cultivo_actual ?? null}::uuid))
        AND (${q.busqueda === ''} OR p.nombre ILIKE ${`%${q.busqueda}%`} OR p.codigo ILIKE ${`%${q.busqueda}%`})
    `);
    return { data: result.rows, total: Number(totalResult.rows[0]?.total ?? 0) };
  }

  async obtenerParcela(org: string, id: string) {
    const result = await db.execute(sql`
      SELECT p.id,p.finca_id AS "fincaId",f.nombre AS finca,p.nombre,p.codigo,
        ST_AsGeoJSON(p.geometria)::jsonb AS geometria,p.superficie_calculada AS "superficieCalculada",
        p.tipo_suelo AS "tipoSuelo",p.altitud,p.pendiente,p.sistema_riego AS "sistemaRiego",p.observaciones,
        p.activo,p.created_at AS "createdAt",p.updated_at AS "updatedAt"
      FROM parcelas p JOIN fincas f ON f.id=p.finca_id
      WHERE p.organizacion_id=${org} AND p.id=${id} LIMIT 1
    `);
    return result.rows[0];
  }

  async geojsonParcelas(org: string, q: ConsultaGeoJson) {
    const totalResult = await db.execute(sql`SELECT count(*)::int AS total FROM parcelas WHERE organizacion_id=${org} AND (${q.finca ?? null}::uuid IS NULL OR finca_id=${q.finca ?? null}::uuid) AND (${q.activo === undefined} OR activo=${q.activo ?? false})`);
    const simplificar = Number(totalResult.rows[0]?.total ?? 0) > 500;
    const result = await db.execute(sql`
      SELECT p.id,
        CASE WHEN ${simplificar} THEN ST_AsGeoJSON(ST_SimplifyPreserveTopology(p.geometria, 0.00002))::jsonb ELSE ST_AsGeoJSON(p.geometria)::jsonb END AS geometria,
        jsonb_build_object('nombre',p.nombre,'codigo',p.codigo,'finca',f.nombre,'fincaId',p.finca_id,
          'superficieCalculada',p.superficie_calculada,'activo',p.activo,'cultivoActual',cu.nombre_comun) AS propiedades
      FROM parcelas p JOIN fincas f ON f.id=p.finca_id
      LEFT JOIN LATERAL (SELECT cc.cultivo_id FROM ciclos_cultivo cc WHERE cc.parcela_id=p.id AND cc.organizacion_id=p.organizacion_id AND cc.estado='en_curso' ORDER BY cc.fecha_siembra DESC LIMIT 1) c ON true
      LEFT JOIN cultivos cu ON cu.id=c.cultivo_id AND cu.organizacion_id=p.organizacion_id
      WHERE p.organizacion_id=${org} AND (${q.finca ?? null}::uuid IS NULL OR p.finca_id=${q.finca ?? null}::uuid)
        AND (${q.activo === undefined} OR p.activo=${q.activo ?? false})
      ORDER BY p.nombre
    `);
    return { simplificado: simplificar, features: result.rows.map((row) => ({ type: 'Feature', id: row.id, geometry: row.geometria, properties: row.propiedades })) };
  }

  crearParcela(datos: ParcelaInput, ctx: ContextoAuditoria) {
    return db.transaction(async (tx) => {
      const result = await tx.execute(sql`
        INSERT INTO parcelas (organizacion_id,finca_id,nombre,codigo,geometria,tipo_suelo,altitud,pendiente,sistema_riego,observaciones,activo)
        SELECT ${ctx.organizacionId},f.id,${datos.nombre},${datos.codigo},ST_SetSRID(ST_GeomFromGeoJSON(${json(datos.geometria)}),4326),
          ${datos.tipoSuelo ?? null},${datos.altitud ?? null},${datos.pendiente ?? null},${datos.sistemaRiego ?? null},${datos.observaciones ?? null},${datos.activo}
        FROM fincas f WHERE f.id=${datos.fincaId} AND f.organizacion_id=${ctx.organizacionId}
        RETURNING id,finca_id AS "fincaId",nombre,codigo,ST_AsGeoJSON(geometria)::jsonb AS geometria,
          superficie_calculada AS "superficieCalculada",tipo_suelo AS "tipoSuelo",altitud,pendiente,
          sistema_riego AS "sistemaRiego",observaciones,activo,created_at AS "createdAt",updated_at AS "updatedAt"
      `);
      const fila = result.rows[0];
      if (fila) await registrarAuditoria(tx, ctx, 'CREAR', 'parcelas', String(fila.id), null, fila);
      return fila;
    });
  }

  actualizarParcela(id: string, datos: ActualizarParcelaInput, ctx: ContextoAuditoria) {
    return db.transaction(async (tx) => {
      const anteriorResult = await tx.execute(sql`SELECT id,finca_id AS "fincaId",nombre,codigo,ST_AsGeoJSON(geometria)::jsonb AS geometria,superficie_calculada AS "superficieCalculada",tipo_suelo AS "tipoSuelo",altitud,pendiente,sistema_riego AS "sistemaRiego",observaciones,activo FROM parcelas WHERE id=${id} AND organizacion_id=${ctx.organizacionId} FOR UPDATE`);
      const anterior = anteriorResult.rows[0];
      if (!anterior) return undefined;
      const asignaciones = [];
      if (datos.fincaId !== undefined) {
        const padre = await tx.execute(sql`SELECT id FROM fincas WHERE id=${datos.fincaId} AND organizacion_id=${ctx.organizacionId}`);
        if (!padre.rows[0]) return 'FINCA_INVALIDA' as const;
        asignaciones.push(sql`finca_id=${datos.fincaId}`);
      }
      if (datos.nombre !== undefined) asignaciones.push(sql`nombre=${datos.nombre}`);
      if (datos.codigo !== undefined) asignaciones.push(sql`codigo=${datos.codigo}`);
      if (datos.geometria !== undefined) asignaciones.push(sql`geometria=ST_SetSRID(ST_GeomFromGeoJSON(${json(datos.geometria)}),4326)`);
      if (datos.tipoSuelo !== undefined) asignaciones.push(sql`tipo_suelo=${datos.tipoSuelo}`);
      if (datos.altitud !== undefined) asignaciones.push(sql`altitud=${datos.altitud}`);
      if (datos.pendiente !== undefined) asignaciones.push(sql`pendiente=${datos.pendiente}`);
      if (datos.sistemaRiego !== undefined) asignaciones.push(sql`sistema_riego=${datos.sistemaRiego}`);
      if (datos.observaciones !== undefined) asignaciones.push(sql`observaciones=${datos.observaciones}`);
      if (datos.activo !== undefined) asignaciones.push(sql`activo=${datos.activo}`);
      asignaciones.push(sql`updated_at=now()`);
      const result = await tx.execute(sql`UPDATE parcelas SET ${sql.join(asignaciones, sql`, `)} WHERE id=${id} AND organizacion_id=${ctx.organizacionId} RETURNING id,finca_id AS "fincaId",nombre,codigo,ST_AsGeoJSON(geometria)::jsonb AS geometria,superficie_calculada AS "superficieCalculada",tipo_suelo AS "tipoSuelo",altitud,pendiente,sistema_riego AS "sistemaRiego",observaciones,activo,created_at AS "createdAt",updated_at AS "updatedAt"`);
      const fila = result.rows[0];
      await registrarAuditoria(tx, ctx, 'ACTUALIZAR', 'parcelas', id, anterior, fila);
      return fila;
    });
  }

  desactivarParcela(id: string, ctx: ContextoAuditoria) { return db.transaction(async (tx) => {
    const antes = await tx.execute(sql`SELECT * FROM parcelas WHERE id=${id} AND organizacion_id=${ctx.organizacionId} FOR UPDATE`); const anterior = antes.rows[0]; if (!anterior) return undefined;
    const result = await tx.execute(sql`UPDATE parcelas SET activo=false,updated_at=now() WHERE id=${id} AND organizacion_id=${ctx.organizacionId} RETURNING *`); const fila = result.rows[0];
    await registrarAuditoria(tx, ctx, 'DESACTIVAR', 'parcelas', id, anterior, fila); return fila;
  }); }

  async parcelasFinca(org: string, fincaId: string) {
    const result = await db.execute(sql`SELECT p.id,p.finca_id AS "fincaId",p.nombre,p.codigo,p.superficie_calculada AS "superficieCalculada",p.tipo_suelo AS "tipoSuelo",p.activo FROM parcelas p JOIN fincas f ON f.id=p.finca_id WHERE p.organizacion_id=${org} AND f.organizacion_id=${org} AND f.id=${fincaId} ORDER BY p.nombre`);
    return result.rows;
  }

  private geometriaSql(geojson: unknown) { return sql`ST_SetSRID(ST_GeomFromGeoJSON(${json(geojson)}),4326)`; }

  async crudLote(operacion: 'obtener'|'crear'|'actualizar'|'desactivar'|'listar'|'geojson', id: string | undefined, datos: LoteParcelaInput | ActualizarLoteParcelaInput | undefined, ctx: ContextoAuditoria) {
    if (operacion === 'listar' || operacion === 'geojson') {
      const rows = await db.execute(sql`SELECT l.id,l.parcela_id AS "parcelaId",p.nombre AS parcela,l.nombre,l.superficie,l.activo,${operacion === 'geojson' ? sql`ST_AsGeoJSON(l.geometria)::jsonb` : sql`NULL::jsonb`} AS geometria FROM lotes_parcela l JOIN parcelas p ON p.id=l.parcela_id WHERE l.organizacion_id=${ctx.organizacionId} AND p.organizacion_id=${ctx.organizacionId} AND (${id ?? null}::uuid IS NULL OR l.parcela_id=${id ?? null}::uuid) ORDER BY l.nombre`);
      return operacion === 'geojson' ? { type: 'FeatureCollection', features: rows.rows.map((r) => ({ type: 'Feature', id: r.id, geometry: r.geometria, properties: { parcelaId: r.parcelaId, parcela: r.parcela, nombre: r.nombre, superficie: r.superficie, activo: r.activo } })) } : rows.rows;
    }
    if (operacion === 'crear') {
      const d = datos as LoteParcelaInput;
      return db.transaction(async (tx) => {
        const result = await tx.execute(sql`INSERT INTO lotes_parcela(organizacion_id,parcela_id,nombre,geometria,activo) SELECT ${ctx.organizacionId},p.id,${d.nombre},${this.geometriaSql(d.geometria)},${d.activo} FROM parcelas p WHERE p.id=${d.parcelaId} AND p.organizacion_id=${ctx.organizacionId} RETURNING id,parcela_id AS "parcelaId",nombre,ST_AsGeoJSON(geometria)::jsonb AS geometria,superficie,activo,created_at AS "createdAt",updated_at AS "updatedAt"`);
        const fila = result.rows[0]; if (fila) await registrarAuditoria(tx, ctx, 'CREAR', 'lotes_parcela', String(fila.id), null, fila); return fila;
      });
    }
    const result = await db.execute(sql`SELECT id,parcela_id AS "parcelaId",nombre,ST_AsGeoJSON(geometria)::jsonb AS geometria,superficie,activo,created_at AS "createdAt",updated_at AS "updatedAt" FROM lotes_parcela WHERE id=${id!} AND organizacion_id=${ctx.organizacionId}`);
    const anterior = result.rows[0]; if (!anterior) return undefined;
    if (operacion === 'obtener') return anterior;
    return db.transaction(async (tx) => {
      const locked = await tx.execute(sql`SELECT * FROM lotes_parcela WHERE id=${id!} AND organizacion_id=${ctx.organizacionId} FOR UPDATE`); const antes = locked.rows[0]; if (!antes) return undefined;
      let fila;
      if (operacion === 'desactivar') {
        const updated = await tx.execute(sql`UPDATE lotes_parcela SET activo=false,updated_at=now() WHERE id=${id!} AND organizacion_id=${ctx.organizacionId} RETURNING *`); fila = updated.rows[0];
        await registrarAuditoria(tx, ctx, 'DESACTIVAR', 'lotes_parcela', id!, antes, fila); return fila;
      }
      const d = datos as ActualizarLoteParcelaInput; const a = [];
      if (d.nombre !== undefined) a.push(sql`nombre=${d.nombre}`);
      if (d.geometria !== undefined) a.push(sql`geometria=${this.geometriaSql(d.geometria)}`);
      if (d.activo !== undefined) a.push(sql`activo=${d.activo}`);
      a.push(sql`updated_at=now()`);
      const updated = await tx.execute(sql`UPDATE lotes_parcela SET ${sql.join(a, sql`, `)} WHERE id=${id!} AND organizacion_id=${ctx.organizacionId} RETURNING id,parcela_id AS "parcelaId",nombre,ST_AsGeoJSON(geometria)::jsonb AS geometria,superficie,activo,created_at AS "createdAt",updated_at AS "updatedAt"`); fila = updated.rows[0];
      await registrarAuditoria(tx, ctx, 'ACTUALIZAR', 'lotes_parcela', id!, antes, fila); return fila;
    });
  }

  async crudPunto(operacion: 'obtener'|'crear'|'actualizar'|'desactivar'|'listar'|'geojson', id: string | undefined, datos: PuntoInteresInput | ActualizarPuntoInteresInput | undefined, ctx: ContextoAuditoria) {
    if (operacion === 'listar' || operacion === 'geojson') {
      const rows = await db.execute(sql`SELECT i.id,i.finca_id AS "fincaId",i.parcela_id AS "parcelaId",i.nombre,i.tipo,i.descripcion,ST_AsGeoJSON(i.geometria)::jsonb AS geometria FROM puntos_interes i JOIN fincas f ON f.id=i.finca_id WHERE i.organizacion_id=${ctx.organizacionId} AND f.organizacion_id=${ctx.organizacionId} AND (${id ?? null}::uuid IS NULL OR i.finca_id=${id ?? null}::uuid) ORDER BY i.nombre`);
      return operacion === 'geojson' ? { type: 'FeatureCollection', features: rows.rows.map((r) => ({ type: 'Feature', id: r.id, geometry: r.geometria, properties: { fincaId: r.fincaId, parcelaId: r.parcelaId, nombre: r.nombre, tipo: r.tipo, descripcion: r.descripcion } })) } : rows.rows;
    }
    if (operacion === 'crear') {
      const d = datos as PuntoInteresInput;
      return db.transaction(async (tx) => {
        const result = await tx.execute(sql`INSERT INTO puntos_interes(organizacion_id,finca_id,parcela_id,nombre,tipo,geometria,descripcion) SELECT ${ctx.organizacionId},f.id,p.id,${d.nombre},${d.tipo},${this.geometriaSql(d.geometria)},${d.descripcion ?? null} FROM fincas f LEFT JOIN parcelas p ON p.id=${d.parcelaId ?? null} AND p.finca_id=f.id AND p.organizacion_id=${ctx.organizacionId} WHERE f.id=${d.fincaId} AND f.organizacion_id=${ctx.organizacionId} AND (${d.parcelaId ?? null}::uuid IS NULL OR p.id IS NOT NULL) RETURNING id,finca_id AS "fincaId",parcela_id AS "parcelaId",nombre,tipo,ST_AsGeoJSON(geometria)::jsonb AS geometria,descripcion,created_at AS "createdAt",updated_at AS "updatedAt"`);
        const fila = result.rows[0]; if (fila) await registrarAuditoria(tx, ctx, 'CREAR', 'puntos_interes', String(fila.id), null, fila); return fila;
      });
    }
    const result = await db.execute(sql`SELECT id,finca_id AS "fincaId",parcela_id AS "parcelaId",nombre,tipo,ST_AsGeoJSON(geometria)::jsonb AS geometria,descripcion,created_at AS "createdAt",updated_at AS "updatedAt" FROM puntos_interes WHERE id=${id!} AND organizacion_id=${ctx.organizacionId}`);
    const anterior = result.rows[0]; if (!anterior) return undefined; if (operacion === 'obtener') return anterior;
    return db.transaction(async (tx) => {
      const locked = await tx.execute(sql`SELECT * FROM puntos_interes WHERE id=${id!} AND organizacion_id=${ctx.organizacionId} FOR UPDATE`); const antes = locked.rows[0]; if (!antes) return undefined;
      if (operacion === 'desactivar') { const updated = await tx.execute(sql`DELETE FROM puntos_interes WHERE id=${id!} AND organizacion_id=${ctx.organizacionId} RETURNING *`); const fila = updated.rows[0]; await registrarAuditoria(tx, ctx, 'DESACTIVAR', 'puntos_interes', id!, antes, fila); return { eliminado: true, id: id! }; }
      const d = datos as ActualizarPuntoInteresInput; const a = [];
      if (d.parcelaId !== undefined) {
        if (d.parcelaId !== null) { const p = await tx.execute(sql`SELECT id FROM parcelas WHERE id=${d.parcelaId} AND finca_id=${antes.finca_id} AND organizacion_id=${ctx.organizacionId}`); if (!p.rows[0]) return 'PARCELA_INVALIDA' as const; }
        a.push(sql`parcela_id=${d.parcelaId}`);
      }
      if (d.nombre !== undefined) a.push(sql`nombre=${d.nombre}`);
      if (d.tipo !== undefined) a.push(sql`tipo=${d.tipo}`);
      if (d.geometria !== undefined) a.push(sql`geometria=${this.geometriaSql(d.geometria)}`);
      if (d.descripcion !== undefined) a.push(sql`descripcion=${d.descripcion}`);
      a.push(sql`updated_at=now()`);
      const updated = await tx.execute(sql`UPDATE puntos_interes SET ${sql.join(a, sql`, `)} WHERE id=${id!} AND organizacion_id=${ctx.organizacionId} RETURNING id,finca_id AS "fincaId",parcela_id AS "parcelaId",nombre,tipo,ST_AsGeoJSON(geometria)::jsonb AS geometria,descripcion,created_at AS "createdAt",updated_at AS "updatedAt"`); const fila = updated.rows[0];
      await registrarAuditoria(tx, ctx, 'ACTUALIZAR', 'puntos_interes', id!, antes, fila); return fila;
    });
  }
}

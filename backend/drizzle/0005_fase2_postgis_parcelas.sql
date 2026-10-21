CREATE EXTENSION IF NOT EXISTS postgis;
--> statement-breakpoint

CREATE TYPE tipo_cultivo AS ENUM ('granos', 'hortalizas', 'frutales', 'forrajes', 'otros');
--> statement-breakpoint
CREATE TYPE tipo_punto_interes AS ENUM ('pozo', 'bomba', 'bodega', 'casa', 'punto_muestreo');
--> statement-breakpoint
CREATE TYPE estado_ciclo_cultivo AS ENUM ('planificado', 'en_curso', 'cosechado', 'perdido');
--> statement-breakpoint
CREATE TYPE tipo_actividad_campo AS ENUM ('siembra', 'riego', 'fertilizacion', 'fumigacion', 'poda', 'cosecha', 'muestreo', 'otro');
--> statement-breakpoint
CREATE TYPE severidad_plaga AS ENUM ('baja', 'media', 'alta', 'critica');
--> statement-breakpoint
CREATE TYPE fuente_satelital AS ENUM ('sentinel-2', 'landsat', 'planet');
--> statement-breakpoint
CREATE TYPE indice_satelital AS ENUM ('NDVI', 'NDWI', 'EVI');
--> statement-breakpoint

CREATE TABLE fincas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacion_id uuid NOT NULL REFERENCES organizaciones(id),
  nombre varchar(160) NOT NULL,
  propietario_id uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  direccion text,
  municipio varchar(120),
  departamento varchar(120),
  superficie_total numeric(14,2) NOT NULL DEFAULT 0 CHECK (superficie_total >= 0),
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fincas_org_nombre_uq UNIQUE (organizacion_id, nombre)
);
--> statement-breakpoint
CREATE INDEX fincas_org_idx ON fincas(organizacion_id);
--> statement-breakpoint

CREATE TABLE parcelas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacion_id uuid NOT NULL REFERENCES organizaciones(id),
  finca_id uuid NOT NULL REFERENCES fincas(id),
  nombre varchar(160) NOT NULL,
  codigo varchar(60) NOT NULL,
  geometria geometry(Polygon, 4326) NOT NULL,
  superficie_calculada numeric(14,2) NOT NULL DEFAULT 0 CHECK (superficie_calculada >= 0),
  tipo_suelo varchar(120),
  altitud numeric(9,2),
  pendiente numeric(7,3),
  sistema_riego varchar(120),
  observaciones text,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT parcelas_org_codigo_uq UNIQUE (organizacion_id, codigo)
);
--> statement-breakpoint
CREATE INDEX parcelas_org_finca_idx ON parcelas(organizacion_id, finca_id);
--> statement-breakpoint
CREATE INDEX parcelas_geometria_gist_idx ON parcelas USING GIST (geometria);
--> statement-breakpoint

CREATE TABLE lotes_parcela (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacion_id uuid NOT NULL REFERENCES organizaciones(id),
  parcela_id uuid NOT NULL REFERENCES parcelas(id) ON DELETE CASCADE,
  nombre varchar(120) NOT NULL,
  geometria geometry(Polygon, 4326) NOT NULL,
  superficie numeric(14,2) NOT NULL DEFAULT 0 CHECK (superficie >= 0),
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX lotes_parcela_parcela_idx ON lotes_parcela(organizacion_id, parcela_id);
--> statement-breakpoint
CREATE INDEX lotes_parcela_geometria_gist_idx ON lotes_parcela USING GIST (geometria);
--> statement-breakpoint

CREATE TABLE puntos_interes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacion_id uuid NOT NULL REFERENCES organizaciones(id),
  parcela_id uuid REFERENCES parcelas(id) ON DELETE SET NULL,
  finca_id uuid NOT NULL REFERENCES fincas(id) ON DELETE CASCADE,
  nombre varchar(160) NOT NULL,
  tipo tipo_punto_interes NOT NULL,
  geometria geometry(Point, 4326) NOT NULL,
  descripcion text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX puntos_interes_finca_idx ON puntos_interes(organizacion_id, finca_id);
--> statement-breakpoint
CREATE INDEX puntos_interes_geometria_gist_idx ON puntos_interes USING GIST (geometria);
--> statement-breakpoint

CREATE TABLE cultivos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacion_id uuid NOT NULL REFERENCES organizaciones(id),
  nombre_comun varchar(120) NOT NULL,
  nombre_cientifico varchar(180),
  variedad varchar(120),
  tipo tipo_cultivo NOT NULL DEFAULT 'otros',
  ciclo_dias integer CHECK (ciclo_dias IS NULL OR ciclo_dias > 0),
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cultivos_org_nombre_variedad_uq UNIQUE (organizacion_id, nombre_comun, variedad)
);
--> statement-breakpoint
CREATE INDEX cultivos_org_idx ON cultivos(organizacion_id, activo);
--> statement-breakpoint

CREATE TABLE ciclos_cultivo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacion_id uuid NOT NULL REFERENCES organizaciones(id),
  parcela_id uuid NOT NULL REFERENCES parcelas(id),
  cultivo_id uuid NOT NULL REFERENCES cultivos(id),
  fecha_siembra date NOT NULL,
  fecha_cosecha_estimada date,
  fecha_cosecha_real date,
  estado estado_ciclo_cultivo NOT NULL DEFAULT 'planificado',
  rendimiento_estimado numeric(14,3) CHECK (rendimiento_estimado IS NULL OR rendimiento_estimado >= 0),
  rendimiento_real numeric(14,3) CHECK (rendimiento_real IS NULL OR rendimiento_real >= 0),
  unidad_rendimiento varchar(24),
  observaciones text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX ciclos_cultivo_parcela_fecha_idx ON ciclos_cultivo(organizacion_id, parcela_id, fecha_siembra DESC);
--> statement-breakpoint
CREATE INDEX ciclos_cultivo_estado_idx ON ciclos_cultivo(organizacion_id, estado);
--> statement-breakpoint

CREATE TABLE actividades_campo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacion_id uuid NOT NULL REFERENCES organizaciones(id),
  ciclo_cultivo_id uuid REFERENCES ciclos_cultivo(id) ON DELETE SET NULL,
  parcela_id uuid NOT NULL REFERENCES parcelas(id),
  tipo tipo_actividad_campo NOT NULL,
  fecha timestamptz NOT NULL,
  descripcion text NOT NULL,
  usuario_id uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  costo_total numeric(14,2) NOT NULL DEFAULT 0 CHECK (costo_total >= 0),
  producto_id uuid REFERENCES productos(id) ON DELETE SET NULL,
  cantidad_producto numeric(14,3) CHECK (cantidad_producto IS NULL OR cantidad_producto > 0),
  clima jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT actividades_producto_cantidad_ck CHECK ((producto_id IS NULL) = (cantidad_producto IS NULL))
);
--> statement-breakpoint
CREATE INDEX actividades_campo_parcela_fecha_idx ON actividades_campo(organizacion_id, parcela_id, fecha DESC);
--> statement-breakpoint
CREATE INDEX actividades_campo_ciclo_idx ON actividades_campo(ciclo_cultivo_id, fecha DESC);
--> statement-breakpoint
CREATE INDEX actividades_campo_producto_idx ON actividades_campo(producto_id) WHERE producto_id IS NOT NULL;
--> statement-breakpoint

CREATE TABLE monitoreo_plagas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacion_id uuid NOT NULL REFERENCES organizaciones(id),
  ciclo_cultivo_id uuid REFERENCES ciclos_cultivo(id) ON DELETE SET NULL,
  parcela_id uuid NOT NULL REFERENCES parcelas(id),
  fecha timestamptz NOT NULL,
  plaga_enfermedad varchar(180) NOT NULL,
  severidad severidad_plaga NOT NULL,
  incidencia_porcentaje numeric(5,2) NOT NULL DEFAULT 0 CHECK (incidencia_porcentaje BETWEEN 0 AND 100),
  accion_tomada text,
  producto_aplicado varchar(180),
  usuario_id uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  observaciones text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX monitoreo_plagas_alertas_idx ON monitoreo_plagas(organizacion_id, fecha DESC, severidad);
--> statement-breakpoint
CREATE INDEX monitoreo_plagas_parcela_idx ON monitoreo_plagas(parcela_id, fecha DESC);
--> statement-breakpoint

CREATE TABLE fotos_campo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacion_id uuid NOT NULL REFERENCES organizaciones(id),
  parcela_id uuid NOT NULL REFERENCES parcelas(id),
  ciclo_cultivo_id uuid REFERENCES ciclos_cultivo(id) ON DELETE SET NULL,
  actividad_id uuid REFERENCES actividades_campo(id) ON DELETE SET NULL,
  archivo_url text NOT NULL,
  archivo_thumb_url text NOT NULL,
  latitud numeric(10,7) NOT NULL CHECK (latitud BETWEEN -90 AND 90),
  longitud numeric(10,7) NOT NULL CHECK (longitud BETWEEN -180 AND 180),
  ubicacion geometry(Point, 4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(longitud::double precision, latitud::double precision), 4326)) STORED,
  altitud numeric(9,2),
  precision_gps numeric(9,2) CHECK (precision_gps IS NULL OR precision_gps >= 0),
  direccion_foto numeric(6,2) CHECK (direccion_foto IS NULL OR direccion_foto BETWEEN 0 AND 360),
  fecha_captura timestamptz,
  usuario_id uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  descripcion text,
  etiquetas jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX fotos_campo_parcela_fecha_idx ON fotos_campo(organizacion_id, parcela_id, created_at DESC);
--> statement-breakpoint
CREATE INDEX fotos_campo_ubicacion_gist_idx ON fotos_campo USING GIST (ubicacion);
--> statement-breakpoint

CREATE TABLE indices_satelitales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacion_id uuid NOT NULL REFERENCES organizaciones(id),
  parcela_id uuid NOT NULL REFERENCES parcelas(id) ON DELETE CASCADE,
  fecha date NOT NULL,
  fuente fuente_satelital NOT NULL,
  indice indice_satelital NOT NULL,
  valor_promedio numeric(8,5) NOT NULL,
  url_tile text,
  nubosidad numeric(5,2) CHECK (nubosidad IS NULL OR nubosidad BETWEEN 0 AND 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT indices_satelitales_parcela_fecha_fuente_indice_uq UNIQUE (parcela_id, fecha, fuente, indice)
);
--> statement-breakpoint
CREATE INDEX indices_satelitales_parcela_fecha_idx ON indices_satelitales(organizacion_id, parcela_id, fecha DESC);
--> statement-breakpoint

CREATE OR REPLACE FUNCTION calcular_superficie_m2(geom geometry)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
STRICT
PARALLEL SAFE
AS $$ SELECT round(ST_Area(geom::geography)::numeric, 2) $$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION validar_geometria_fase2()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  motivo text;
BEGIN
  IF NEW.geometria IS NULL THEN
    RAISE EXCEPTION 'La geometría es obligatoria.' USING ERRCODE = '22023';
  END IF;
  IF ST_SRID(NEW.geometria) <> 4326 THEN
    RAISE EXCEPTION 'La geometría debe usar SRID 4326 (WGS84), se recibió %.', ST_SRID(NEW.geometria) USING ERRCODE = '22023';
  END IF;
  IF GeometryType(NEW.geometria) <> TG_ARGV[0] THEN
    RAISE EXCEPTION 'Se esperaba una geometría de tipo %, se recibió %.', TG_ARGV[0], GeometryType(NEW.geometria) USING ERRCODE = '22023';
  END IF;
  IF NOT ST_IsValid(NEW.geometria) THEN
    motivo := ST_IsValidReason(NEW.geometria);
    RAISE EXCEPTION 'Geometría inválida: %.', motivo USING ERRCODE = '22023';
  END IF;
  IF NOT ST_IsSimple(NEW.geometria) THEN
    RAISE EXCEPTION 'La geometría no es simple; contiene cruces o auto-intersecciones.' USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION asignar_superficie_geometria()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_TABLE_NAME = 'parcelas' THEN
    NEW.superficie_calculada := calcular_superficie_m2(NEW.geometria);
  ELSE
    NEW.superficie := calcular_superficie_m2(NEW.geometria);
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER parcelas_validar_geometria_trg BEFORE INSERT OR UPDATE OF geometria ON parcelas
FOR EACH ROW EXECUTE FUNCTION validar_geometria_fase2('POLYGON');
--> statement-breakpoint
CREATE TRIGGER parcelas_superficie_trg BEFORE INSERT OR UPDATE OF geometria ON parcelas
FOR EACH ROW EXECUTE FUNCTION asignar_superficie_geometria();
--> statement-breakpoint
CREATE TRIGGER lotes_parcela_validar_geometria_trg BEFORE INSERT OR UPDATE OF geometria ON lotes_parcela
FOR EACH ROW EXECUTE FUNCTION validar_geometria_fase2('POLYGON');
--> statement-breakpoint
CREATE TRIGGER lotes_parcela_superficie_trg BEFORE INSERT OR UPDATE OF geometria ON lotes_parcela
FOR EACH ROW EXECUTE FUNCTION asignar_superficie_geometria();
--> statement-breakpoint

CREATE OR REPLACE FUNCTION validar_punto_interes_fase2()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF ST_SRID(NEW.geometria) <> 4326 OR GeometryType(NEW.geometria) <> 'POINT' OR NOT ST_IsValid(NEW.geometria) OR NOT ST_IsSimple(NEW.geometria) THEN
    RAISE EXCEPTION 'El punto de interés debe ser POINT válido y simple en SRID 4326.' USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER puntos_interes_validar_geometria_trg BEFORE INSERT OR UPDATE OF geometria ON puntos_interes
FOR EACH ROW EXECUTE FUNCTION validar_punto_interes_fase2();
--> statement-breakpoint

CREATE OR REPLACE FUNCTION actualizar_superficie_finca()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  finca_anterior uuid;
  finca_nueva uuid;
BEGIN
  IF TG_OP <> 'INSERT' THEN finca_anterior := OLD.finca_id; END IF;
  IF TG_OP <> 'DELETE' THEN finca_nueva := NEW.finca_id; END IF;
  IF finca_anterior IS NOT NULL THEN
    UPDATE fincas f SET superficie_total = coalesce((SELECT sum(p.superficie_calculada) FROM parcelas p WHERE p.finca_id = finca_anterior AND p.activo), 0), updated_at = now() WHERE f.id = finca_anterior;
  END IF;
  IF finca_nueva IS NOT NULL AND finca_nueva IS DISTINCT FROM finca_anterior THEN
    UPDATE fincas f SET superficie_total = coalesce((SELECT sum(p.superficie_calculada) FROM parcelas p WHERE p.finca_id = finca_nueva AND p.activo), 0), updated_at = now() WHERE f.id = finca_nueva;
  ELSIF finca_nueva IS NOT NULL AND TG_OP = 'INSERT' THEN
    UPDATE fincas f SET superficie_total = coalesce((SELECT sum(p.superficie_calculada) FROM parcelas p WHERE p.finca_id = finca_nueva AND p.activo), 0), updated_at = now() WHERE f.id = finca_nueva;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER parcelas_superficie_finca_trg AFTER INSERT OR UPDATE OF finca_id, geometria, activo OR DELETE ON parcelas
FOR EACH ROW EXECUTE FUNCTION actualizar_superficie_finca();
--> statement-breakpoint

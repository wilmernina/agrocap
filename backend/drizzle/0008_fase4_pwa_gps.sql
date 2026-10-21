ALTER TABLE asistencias
  ADD COLUMN latitud_entrada numeric(10, 7),
  ADD COLUMN longitud_entrada numeric(10, 7),
  ADD COLUMN precision_gps_entrada numeric(9, 2),
  ADD COLUMN latitud_salida numeric(10, 7),
  ADD COLUMN longitud_salida numeric(10, 7),
  ADD COLUMN precision_gps_salida numeric(9, 2);

ALTER TABLE tareos
  ADD COLUMN latitud numeric(10, 7),
  ADD COLUMN longitud numeric(10, 7),
  ADD COLUMN precision_gps numeric(9, 2);

ALTER TABLE asistencias ADD CONSTRAINT asistencias_gps_entrada_lat_check CHECK (latitud_entrada IS NULL OR latitud_entrada BETWEEN -90 AND 90);
ALTER TABLE asistencias ADD CONSTRAINT asistencias_gps_entrada_lon_check CHECK (longitud_entrada IS NULL OR longitud_entrada BETWEEN -180 AND 180);
ALTER TABLE asistencias ADD CONSTRAINT asistencias_gps_salida_lat_check CHECK (latitud_salida IS NULL OR latitud_salida BETWEEN -90 AND 90);
ALTER TABLE asistencias ADD CONSTRAINT asistencias_gps_salida_lon_check CHECK (longitud_salida IS NULL OR longitud_salida BETWEEN -180 AND 180);
ALTER TABLE tareos ADD CONSTRAINT tareos_gps_lat_check CHECK (latitud IS NULL OR latitud BETWEEN -90 AND 90);
ALTER TABLE tareos ADD CONSTRAINT tareos_gps_lon_check CHECK (longitud IS NULL OR longitud BETWEEN -180 AND 180);

CREATE INDEX asistencias_gps_entrada_idx ON asistencias (organizacion_id, fecha) WHERE latitud_entrada IS NOT NULL;
CREATE INDEX tareos_gps_idx ON tareos (organizacion_id, fecha) WHERE latitud IS NOT NULL;

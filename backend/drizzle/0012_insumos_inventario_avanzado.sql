ALTER TYPE tipo_movimiento ADD VALUE IF NOT EXISTS 'devolucion';
ALTER TABLE lotes_producto ADD COLUMN IF NOT EXISTS estado varchar(16) NOT NULL DEFAULT 'available';
ALTER TABLE lotes_producto ADD COLUMN IF NOT EXISTS cantidad_reservada numeric(14,3) NOT NULL DEFAULT 0;
ALTER TABLE lotes_producto ADD COLUMN IF NOT EXISTS ubicacion varchar(120);
ALTER TABLE lotes_producto ADD COLUMN IF NOT EXISTS costo_unitario numeric(14,4) NOT NULL DEFAULT 0;
ALTER TABLE lotes_producto ADD CONSTRAINT lotes_producto_estado_ck CHECK(estado IN ('available','blocked','quarantine'));
ALTER TABLE lotes_producto ADD CONSTRAINT lotes_producto_reserva_ck CHECK(cantidad_reservada>=0 AND cantidad_reservada<=cantidad_actual);
ALTER TABLE movimientos_inventario ADD COLUMN IF NOT EXISTS costo_unitario numeric(14,4) NOT NULL DEFAULT 0;
ALTER TABLE movimientos_inventario ADD COLUMN IF NOT EXISTS valor_movimiento numeric(14,2) NOT NULL DEFAULT 0;
ALTER TABLE movimientos_inventario ADD COLUMN IF NOT EXISTS cliente_id uuid REFERENCES clientes(id);
ALTER TABLE movimientos_inventario ADD COLUMN IF NOT EXISTS campania_id uuid;
ALTER TABLE movimientos_inventario ADD COLUMN IF NOT EXISTS ciclo_cultivo_id uuid REFERENCES ciclos_cultivo(id);
ALTER TABLE movimientos_inventario ADD COLUMN IF NOT EXISTS actividad_campo_id uuid REFERENCES actividades_campo(id);
ALTER TABLE movimientos_inventario ADD COLUMN IF NOT EXISTS orden_trabajo_id uuid;
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS parcela_id uuid REFERENCES parcelas(id);
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS ciclo_cultivo_id uuid REFERENCES ciclos_cultivo(id);
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS actividad_campo_id uuid REFERENCES actividades_campo(id);
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS campania_id uuid;
CREATE TABLE IF NOT EXISTS conversiones_unidad_medida (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organizacion_id uuid NOT NULL REFERENCES organizaciones(id) ON DELETE CASCADE,
 unidad_origen_id uuid NOT NULL REFERENCES unidades_medida(id), unidad_destino_id uuid NOT NULL REFERENCES unidades_medida(id),
 factor numeric(18,8) NOT NULL CHECK(factor>0), UNIQUE(organizacion_id,unidad_origen_id,unidad_destino_id), CHECK(unidad_origen_id<>unidad_destino_id)
);
CREATE TABLE IF NOT EXISTS presentaciones_producto (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organizacion_id uuid NOT NULL REFERENCES organizaciones(id) ON DELETE CASCADE,
 producto_id uuid NOT NULL REFERENCES productos(id) ON DELETE CASCADE, nombre varchar(100) NOT NULL, unidad_id uuid NOT NULL REFERENCES unidades_medida(id),
 factor_a_unidad_base numeric(18,8) NOT NULL CHECK(factor_a_unidad_base>0), codigo_barras varchar(80), precio_venta numeric(14,2), activo boolean NOT NULL DEFAULT true,
 UNIQUE(organizacion_id,producto_id,nombre)
);
CREATE UNIQUE INDEX IF NOT EXISTS presentaciones_producto_barcode_uq ON presentaciones_producto(organizacion_id,codigo_barras) WHERE codigo_barras IS NOT NULL;
CREATE TABLE IF NOT EXISTS inventario_reservas (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organizacion_id uuid NOT NULL REFERENCES organizaciones(id) ON DELETE CASCADE,
 lote_producto_id uuid NOT NULL REFERENCES lotes_producto(id), cantidad numeric(14,3) NOT NULL CHECK(cantidad>0), cliente_id uuid REFERENCES clientes(id), referencia varchar(100),
 estado varchar(12) NOT NULL DEFAULT 'active' CHECK(estado IN ('active','released','fulfilled','expired')), vence_en timestamptz, creado_por uuid REFERENCES usuarios(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS conteos_inventario (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organizacion_id uuid NOT NULL REFERENCES organizaciones(id) ON DELETE CASCADE,
 lote_producto_id uuid NOT NULL REFERENCES lotes_producto(id), cantidad_sistema numeric(14,3) NOT NULL, cantidad_contada numeric(14,3) NOT NULL CHECK(cantidad_contada>=0), diferencia numeric(14,3) GENERATED ALWAYS AS(cantidad_contada-cantidad_sistema) STORED,
 motivo text NOT NULL, estado varchar(12) NOT NULL DEFAULT 'pending' CHECK(estado IN ('pending','adjusted','dismissed')), contado_por uuid REFERENCES usuarios(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS campanias_insumos (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organizacion_id uuid NOT NULL REFERENCES organizaciones(id) ON DELETE CASCADE,
 nombre varchar(160) NOT NULL, inicio date, fin date, active boolean NOT NULL DEFAULT true, UNIQUE(organizacion_id,nombre)
);
ALTER TABLE movimientos_inventario ADD CONSTRAINT movimientos_inventario_campania_fk FOREIGN KEY(campania_id) REFERENCES campanias_insumos(id);
ALTER TABLE ventas ADD CONSTRAINT ventas_campania_fk FOREIGN KEY(campania_id) REFERENCES campanias_insumos(id);
CREATE INDEX IF NOT EXISTS lotes_producto_estado_ubicacion_idx ON lotes_producto(organizacion_id,almacen_id,estado,fecha_vencimiento);
CREATE INDEX IF NOT EXISTS inventario_reservas_lote_estado_idx ON inventario_reservas(lote_producto_id,estado);
CREATE INDEX IF NOT EXISTS conteos_inventario_org_estado_idx ON conteos_inventario(organizacion_id,estado);
CREATE OR REPLACE FUNCTION asignar_costo_lote() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE precio numeric(14,4); cantidad_ingreso numeric(14,3);
BEGIN
 IF TG_OP='INSERT' AND NEW.costo_unitario=0 THEN
  SELECT dc.precio_unitario INTO precio FROM detalle_compra dc JOIN compras c ON c.id=dc.compra_id
   WHERE c.organizacion_id=NEW.organizacion_id AND c.almacen_id=NEW.almacen_id AND c.estado='borrador'
    AND dc.producto_id=NEW.producto_id AND dc.lote=NEW.numero_lote ORDER BY c.created_at DESC LIMIT 1;
  IF precio IS NULL THEN SELECT precio_costo INTO precio FROM productos WHERE id=NEW.producto_id; END IF;
  NEW.costo_unitario:=COALESCE(precio,0);
 ELSIF TG_OP='UPDATE' AND NEW.cantidad_actual>OLD.cantidad_actual AND NEW.costo_unitario=OLD.costo_unitario THEN
  cantidad_ingreso:=NEW.cantidad_actual-OLD.cantidad_actual;
  SELECT dc.precio_unitario INTO precio FROM detalle_compra dc JOIN compras c ON c.id=dc.compra_id
   WHERE c.organizacion_id=NEW.organizacion_id AND c.almacen_id=NEW.almacen_id AND c.estado='borrador'
    AND dc.producto_id=NEW.producto_id AND dc.lote=NEW.numero_lote ORDER BY c.created_at DESC LIMIT 1;
  IF precio IS NOT NULL AND NEW.cantidad_actual>0 THEN
   NEW.costo_unitario:=((OLD.cantidad_actual*OLD.costo_unitario)+(cantidad_ingreso*precio))/NEW.cantidad_actual;
  END IF;
 END IF;
 RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS lotes_producto_asignar_costo ON lotes_producto;
CREATE TRIGGER lotes_producto_asignar_costo BEFORE INSERT ON lotes_producto FOR EACH ROW EXECUTE FUNCTION asignar_costo_lote();
DROP TRIGGER IF EXISTS lotes_producto_recalcular_costo ON lotes_producto;
CREATE TRIGGER lotes_producto_recalcular_costo BEFORE UPDATE OF cantidad_actual ON lotes_producto FOR EACH ROW EXECUTE FUNCTION asignar_costo_lote();
CREATE OR REPLACE FUNCTION validar_salida_de_lote() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE tipo_producto varchar(24); estado_lote varchar(16); vence date; lote_id uuid; lote_costo numeric(14,4); venta_row record;
BEGIN
 IF NEW.tipo='salida' AND NEW.referencia_tipo='venta' THEN
  SELECT cliente_id,parcela_id,ciclo_cultivo_id,actividad_campo_id,campania_id,orden_servicio_id INTO venta_row FROM ventas WHERE id=NEW.referencia_id AND organizacion_id=NEW.organizacion_id;
  NEW.cliente_id:=COALESCE(NEW.cliente_id,venta_row.cliente_id);NEW.parcela_id:=COALESCE(NEW.parcela_id,venta_row.parcela_id);
  NEW.ciclo_cultivo_id:=COALESCE(NEW.ciclo_cultivo_id,venta_row.ciclo_cultivo_id);NEW.actividad_campo_id:=COALESCE(NEW.actividad_campo_id,venta_row.actividad_campo_id);
  NEW.campania_id:=COALESCE(NEW.campania_id,venta_row.campania_id);NEW.orden_trabajo_id:=COALESCE(NEW.orden_trabajo_id,venta_row.orden_servicio_id);
  SELECT tipo INTO tipo_producto FROM productos WHERE id=NEW.producto_id AND organizacion_id=NEW.organizacion_id;
  IF tipo_producto IN ('semilla','fertilizante','herbicida','fungicida','insecticida') AND NEW.lote_producto_id IS NULL THEN
   SELECT id,costo_unitario INTO lote_id,lote_costo FROM lotes_producto
    WHERE organizacion_id=NEW.organizacion_id AND producto_id=NEW.producto_id AND almacen_id=NEW.almacen_id
     AND estado='available' AND (fecha_vencimiento IS NULL OR fecha_vencimiento>=CURRENT_DATE)
     AND cantidad_actual-cantidad_reservada>=NEW.cantidad
    ORDER BY fecha_vencimiento NULLS LAST,created_at LIMIT 1 FOR UPDATE SKIP LOCKED;
   IF lote_id IS NULL THEN RAISE EXCEPTION 'No hay lote disponible y vigente suficiente para la venta' USING ERRCODE='23514'; END IF;
   UPDATE lotes_producto SET cantidad_actual=cantidad_actual-NEW.cantidad WHERE id=lote_id;
   NEW.lote_producto_id:=lote_id; NEW.costo_unitario:=lote_costo; NEW.valor_movimiento:=round(NEW.cantidad*lote_costo,2);
  END IF;
  IF NEW.lote_producto_id IS NOT NULL THEN
   SELECT estado,fecha_vencimiento,costo_unitario INTO estado_lote,vence,lote_costo FROM lotes_producto WHERE id=NEW.lote_producto_id AND organizacion_id=NEW.organizacion_id AND producto_id=NEW.producto_id AND almacen_id=NEW.almacen_id;
   IF estado_lote IS NULL OR estado_lote<>'available' OR (vence IS NOT NULL AND vence<CURRENT_DATE) THEN
    RAISE EXCEPTION 'Lote no disponible, bloqueado o vencido' USING ERRCODE='23514';
   END IF;
   NEW.costo_unitario:=lote_costo; NEW.valor_movimiento:=round(NEW.cantidad*lote_costo,2);
  END IF;
 ELSIF NEW.tipo='entrada' AND NEW.referencia_tipo='venta_anulada' AND NEW.lote_producto_id IS NULL THEN
  SELECT lote_producto_id INTO lote_id FROM movimientos_inventario WHERE organizacion_id=NEW.organizacion_id AND referencia_tipo='venta' AND referencia_id=NEW.referencia_id AND producto_id=NEW.producto_id AND tipo='salida' AND cantidad=NEW.cantidad AND lote_producto_id IS NOT NULL ORDER BY created_at LIMIT 1;
  IF lote_id IS NOT NULL THEN
   UPDATE lotes_producto SET cantidad_actual=cantidad_actual+NEW.cantidad WHERE id=lote_id;
   SELECT costo_unitario INTO lote_costo FROM lotes_producto WHERE id=lote_id;
   NEW.lote_producto_id:=lote_id;NEW.costo_unitario:=lote_costo;NEW.valor_movimiento:=round(NEW.cantidad*lote_costo,2);
  END IF;
 END IF;
 RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS movimientos_inventario_validar_lote_venta ON movimientos_inventario;
CREATE TRIGGER movimientos_inventario_validar_lote_venta BEFORE INSERT ON movimientos_inventario FOR EACH ROW EXECUTE FUNCTION validar_salida_de_lote();

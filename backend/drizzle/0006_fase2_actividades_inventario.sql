ALTER TABLE actividades_campo
  ADD COLUMN almacen_id uuid REFERENCES almacenes(id),
  ADD COLUMN costo_producto_unitario numeric(14,2) CHECK (costo_producto_unitario IS NULL OR costo_producto_unitario >= 0);
--> statement-breakpoint
ALTER TABLE actividades_campo
  ADD CONSTRAINT actividades_consumo_contexto_ck CHECK (
    (producto_id IS NULL AND cantidad_producto IS NULL AND almacen_id IS NULL AND costo_producto_unitario IS NULL)
    OR (producto_id IS NOT NULL AND cantidad_producto IS NOT NULL AND almacen_id IS NOT NULL AND costo_producto_unitario IS NOT NULL)
  );
--> statement-breakpoint
CREATE INDEX actividades_campo_almacen_idx ON actividades_campo(organizacion_id, almacen_id) WHERE almacen_id IS NOT NULL;

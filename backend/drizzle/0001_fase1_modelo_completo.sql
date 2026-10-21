CREATE TYPE "public"."estado_compra" AS ENUM('borrador', 'confirmada', 'anulada');--> statement-breakpoint
CREATE TYPE "public"."estado_venta" AS ENUM('borrador', 'confirmada', 'pagada', 'anulada');--> statement-breakpoint
CREATE TYPE "public"."metodo_pago" AS ENUM('efectivo', 'transferencia', 'qr', 'cheque');--> statement-breakpoint
CREATE TYPE "public"."rol_usuario" AS ENUM('admin', 'vendedor', 'tecnico', 'almacenero');--> statement-breakpoint
CREATE TYPE "public"."tipo_cliente" AS ENUM('externo', 'socio', 'interno');--> statement-breakpoint
CREATE TYPE "public"."tipo_movimiento" AS ENUM('entrada', 'salida', 'ajuste', 'transferencia');--> statement-breakpoint
CREATE TYPE "public"."tipo_pago_venta" AS ENUM('contado', 'credito');--> statement-breakpoint
CREATE TYPE "public"."tipo_producto" AS ENUM('semilla', 'fertilizante', 'herbicida', 'fungicida', 'insecticida', 'herramienta', 'maquinaria', 'otro');--> statement-breakpoint
CREATE TABLE "almacenes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizacion_id" uuid NOT NULL,
	"codigo" varchar(20) NOT NULL,
	"nombre" varchar(120) NOT NULL,
	"direccion" text,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auditoria" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizacion_id" uuid NOT NULL,
	"usuario_id" uuid,
	"accion" varchar(40) NOT NULL,
	"tabla_afectada" varchar(80) NOT NULL,
	"registro_id" uuid,
	"datos_anteriores" jsonb,
	"datos_nuevos" jsonb,
	"ip" "inet",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categorias_producto" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizacion_id" uuid NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"descripcion" text,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clientes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizacion_id" uuid NOT NULL,
	"nombre" varchar(160) NOT NULL,
	"nit_ci" varchar(40),
	"telefono" varchar(30),
	"email" varchar(180),
	"direccion" text,
	"tipo" "tipo_cliente" DEFAULT 'externo' NOT NULL,
	"limite_credito" numeric(12, 2) DEFAULT '0' NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "clientes_fase1_limite_credito_ck" CHECK ("clientes"."limite_credito" >= 0)
);
--> statement-breakpoint
CREATE TABLE "compras" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizacion_id" uuid NOT NULL,
	"almacen_id" uuid NOT NULL,
	"numero_factura" varchar(60) NOT NULL,
	"proveedor_id" uuid NOT NULL,
	"fecha" timestamp with time zone DEFAULT now() NOT NULL,
	"subtotal" numeric(12, 2) DEFAULT '0' NOT NULL,
	"impuestos" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total" numeric(12, 2) DEFAULT '0' NOT NULL,
	"estado" "estado_compra" DEFAULT 'borrador' NOT NULL,
	"observaciones" text,
	"usuario_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "compras_totales_ck" CHECK ("compras"."subtotal" >= 0 AND "compras"."impuestos" >= 0 AND "compras"."total" >= 0)
);
--> statement-breakpoint
CREATE TABLE "detalle_compra" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"compra_id" uuid NOT NULL,
	"producto_id" uuid NOT NULL,
	"cantidad" numeric(14, 3) NOT NULL,
	"precio_unitario" numeric(12, 2) NOT NULL,
	"subtotal" numeric(12, 2) NOT NULL,
	"lote" varchar(80),
	"fecha_vencimiento" date,
	CONSTRAINT "detalle_compra_valores_ck" CHECK ("detalle_compra"."cantidad" > 0 AND "detalle_compra"."precio_unitario" >= 0 AND "detalle_compra"."subtotal" >= 0)
);
--> statement-breakpoint
CREATE TABLE "detalle_venta" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venta_id" uuid NOT NULL,
	"producto_id" uuid NOT NULL,
	"lote_producto_id" uuid,
	"cantidad" numeric(14, 3) NOT NULL,
	"precio_unitario" numeric(12, 2) NOT NULL,
	"descuento" numeric(12, 2) DEFAULT '0' NOT NULL,
	"subtotal" numeric(12, 2) NOT NULL,
	CONSTRAINT "detalle_venta_valores_ck" CHECK ("detalle_venta"."cantidad" > 0 AND "detalle_venta"."precio_unitario" >= 0 AND "detalle_venta"."descuento" >= 0 AND "detalle_venta"."subtotal" >= 0)
);
--> statement-breakpoint
CREATE TABLE "existencias_almacen" (
	"organizacion_id" uuid NOT NULL,
	"almacen_id" uuid NOT NULL,
	"producto_id" uuid NOT NULL,
	"cantidad" numeric(14, 3) DEFAULT '0' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "existencias_almacen_almacen_id_producto_id_pk" PRIMARY KEY("almacen_id","producto_id")
);
--> statement-breakpoint
CREATE TABLE "lotes_producto" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizacion_id" uuid NOT NULL,
	"producto_id" uuid NOT NULL,
	"almacen_id" uuid NOT NULL,
	"numero_lote" varchar(80) NOT NULL,
	"fecha_vencimiento" date,
	"cantidad_inicial" numeric(14, 3) NOT NULL,
	"cantidad_actual" numeric(14, 3) NOT NULL,
	"proveedor_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lotes_producto_cantidades_ck" CHECK ("lotes_producto"."cantidad_inicial" > 0 AND "lotes_producto"."cantidad_actual" >= 0)
);
--> statement-breakpoint
CREATE TABLE "movimientos_inventario" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizacion_id" uuid NOT NULL,
	"producto_id" uuid NOT NULL,
	"almacen_id" uuid NOT NULL,
	"almacen_destino_id" uuid,
	"lote_producto_id" uuid,
	"tipo" "tipo_movimiento" NOT NULL,
	"cantidad" numeric(14, 3) NOT NULL,
	"stock_anterior" numeric(14, 3) NOT NULL,
	"stock_nuevo" numeric(14, 3) NOT NULL,
	"motivo" text NOT NULL,
	"referencia_tipo" varchar(50) NOT NULL,
	"referencia_id" uuid,
	"parcela_id" uuid,
	"usuario_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "movimientos_inventario_fase1_cantidad_ck" CHECK ("movimientos_inventario"."cantidad" > 0)
);
--> statement-breakpoint
CREATE TABLE "organizaciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" varchar(160) NOT NULL,
	"nit" varchar(40),
	"moneda" varchar(3) DEFAULT 'BOB' NOT NULL,
	"zona_horaria" varchar(60) DEFAULT 'America/La_Paz' NOT NULL,
	"permite_stock_negativo" boolean DEFAULT false NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pagos_venta" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizacion_id" uuid NOT NULL,
	"venta_id" uuid NOT NULL,
	"fecha" timestamp with time zone DEFAULT now() NOT NULL,
	"monto" numeric(12, 2) NOT NULL,
	"metodo_pago" "metodo_pago" NOT NULL,
	"referencia" varchar(120),
	"usuario_id" uuid NOT NULL,
	CONSTRAINT "pagos_venta_monto_ck" CHECK ("pagos_venta"."monto" > 0)
);
--> statement-breakpoint
CREATE TABLE "productos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizacion_id" uuid NOT NULL,
	"sku" varchar(60) NOT NULL,
	"codigo_barras" varchar(80),
	"nombre" varchar(160) NOT NULL,
	"descripcion" text,
	"categoria_id" uuid NOT NULL,
	"unidad_medida_id" uuid NOT NULL,
	"tipo" "tipo_producto" DEFAULT 'otro' NOT NULL,
	"precio_costo" numeric(12, 2) DEFAULT '0' NOT NULL,
	"precio_venta" numeric(12, 2) DEFAULT '0' NOT NULL,
	"stock_actual" numeric(14, 3) DEFAULT '0' NOT NULL,
	"stock_minimo" numeric(14, 3) DEFAULT '0' NOT NULL,
	"stock_maximo" numeric(14, 3),
	"requiere_receta" boolean DEFAULT false NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "productos_fase1_precios_ck" CHECK ("productos"."precio_costo" >= 0 AND "productos"."precio_venta" >= 0),
	CONSTRAINT "productos_fase1_stock_ck" CHECK ("productos"."stock_minimo" >= 0 AND ("productos"."stock_maximo" IS NULL OR "productos"."stock_maximo" >= "productos"."stock_minimo"))
);
--> statement-breakpoint
CREATE TABLE "proveedores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizacion_id" uuid NOT NULL,
	"nombre" varchar(160) NOT NULL,
	"nit" varchar(40),
	"telefono" varchar(30),
	"email" varchar(180),
	"direccion" text,
	"contacto" varchar(140),
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "secuencias_documento" (
	"organizacion_id" uuid NOT NULL,
	"tipo_documento" varchar(30) NOT NULL,
	"gestion" integer NOT NULL,
	"valor_actual" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "secuencias_documento_organizacion_id_tipo_documento_gestion_pk" PRIMARY KEY("organizacion_id","tipo_documento","gestion")
);
--> statement-breakpoint
CREATE TABLE "tokens_renovacion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"expira_en" timestamp with time zone NOT NULL,
	"revocado_en" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "unidades_medida" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizacion_id" uuid NOT NULL,
	"nombre" varchar(80) NOT NULL,
	"abreviatura" varchar(12) NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizacion_id" uuid NOT NULL,
	"nombre" varchar(120) NOT NULL,
	"email" varchar(180) NOT NULL,
	"password_hash" text NOT NULL,
	"rol" "rol_usuario" DEFAULT 'vendedor' NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ventas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizacion_id" uuid NOT NULL,
	"almacen_id" uuid NOT NULL,
	"numero_factura" varchar(60) NOT NULL,
	"cliente_id" uuid,
	"fecha" timestamp with time zone DEFAULT now() NOT NULL,
	"subtotal" numeric(12, 2) DEFAULT '0' NOT NULL,
	"descuento" numeric(12, 2) DEFAULT '0' NOT NULL,
	"impuestos" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total" numeric(12, 2) DEFAULT '0' NOT NULL,
	"tipo_pago" "tipo_pago_venta" DEFAULT 'contado' NOT NULL,
	"estado" "estado_venta" DEFAULT 'borrador' NOT NULL,
	"numero_receta" varchar(100),
	"orden_servicio_id" uuid,
	"observaciones" text,
	"usuario_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ventas_fase1_totales_ck" CHECK ("ventas"."subtotal" >= 0 AND "ventas"."descuento" >= 0 AND "ventas"."impuestos" >= 0 AND "ventas"."total" >= 0)
);
--> statement-breakpoint
ALTER TABLE "almacenes" ADD CONSTRAINT "almacenes_organizacion_id_organizaciones_id_fk" FOREIGN KEY ("organizacion_id") REFERENCES "public"."organizaciones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_organizacion_id_organizaciones_id_fk" FOREIGN KEY ("organizacion_id") REFERENCES "public"."organizaciones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categorias_producto" ADD CONSTRAINT "categorias_producto_organizacion_id_organizaciones_id_fk" FOREIGN KEY ("organizacion_id") REFERENCES "public"."organizaciones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_organizacion_id_organizaciones_id_fk" FOREIGN KEY ("organizacion_id") REFERENCES "public"."organizaciones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compras" ADD CONSTRAINT "compras_organizacion_id_organizaciones_id_fk" FOREIGN KEY ("organizacion_id") REFERENCES "public"."organizaciones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compras" ADD CONSTRAINT "compras_almacen_id_almacenes_id_fk" FOREIGN KEY ("almacen_id") REFERENCES "public"."almacenes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compras" ADD CONSTRAINT "compras_proveedor_id_proveedores_id_fk" FOREIGN KEY ("proveedor_id") REFERENCES "public"."proveedores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compras" ADD CONSTRAINT "compras_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "detalle_compra" ADD CONSTRAINT "detalle_compra_compra_id_compras_id_fk" FOREIGN KEY ("compra_id") REFERENCES "public"."compras"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "detalle_compra" ADD CONSTRAINT "detalle_compra_producto_id_productos_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."productos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "detalle_venta" ADD CONSTRAINT "detalle_venta_venta_id_ventas_id_fk" FOREIGN KEY ("venta_id") REFERENCES "public"."ventas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "detalle_venta" ADD CONSTRAINT "detalle_venta_producto_id_productos_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."productos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "detalle_venta" ADD CONSTRAINT "detalle_venta_lote_producto_id_lotes_producto_id_fk" FOREIGN KEY ("lote_producto_id") REFERENCES "public"."lotes_producto"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "existencias_almacen" ADD CONSTRAINT "existencias_almacen_organizacion_id_organizaciones_id_fk" FOREIGN KEY ("organizacion_id") REFERENCES "public"."organizaciones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "existencias_almacen" ADD CONSTRAINT "existencias_almacen_almacen_id_almacenes_id_fk" FOREIGN KEY ("almacen_id") REFERENCES "public"."almacenes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "existencias_almacen" ADD CONSTRAINT "existencias_almacen_producto_id_productos_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."productos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lotes_producto" ADD CONSTRAINT "lotes_producto_organizacion_id_organizaciones_id_fk" FOREIGN KEY ("organizacion_id") REFERENCES "public"."organizaciones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lotes_producto" ADD CONSTRAINT "lotes_producto_producto_id_productos_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."productos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lotes_producto" ADD CONSTRAINT "lotes_producto_almacen_id_almacenes_id_fk" FOREIGN KEY ("almacen_id") REFERENCES "public"."almacenes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lotes_producto" ADD CONSTRAINT "lotes_producto_proveedor_id_proveedores_id_fk" FOREIGN KEY ("proveedor_id") REFERENCES "public"."proveedores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_organizacion_id_organizaciones_id_fk" FOREIGN KEY ("organizacion_id") REFERENCES "public"."organizaciones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_producto_id_productos_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."productos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_almacen_id_almacenes_id_fk" FOREIGN KEY ("almacen_id") REFERENCES "public"."almacenes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_almacen_destino_id_almacenes_id_fk" FOREIGN KEY ("almacen_destino_id") REFERENCES "public"."almacenes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_lote_producto_id_lotes_producto_id_fk" FOREIGN KEY ("lote_producto_id") REFERENCES "public"."lotes_producto"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimientos_inventario" ADD CONSTRAINT "movimientos_inventario_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagos_venta" ADD CONSTRAINT "pagos_venta_organizacion_id_organizaciones_id_fk" FOREIGN KEY ("organizacion_id") REFERENCES "public"."organizaciones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagos_venta" ADD CONSTRAINT "pagos_venta_venta_id_ventas_id_fk" FOREIGN KEY ("venta_id") REFERENCES "public"."ventas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagos_venta" ADD CONSTRAINT "pagos_venta_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "productos" ADD CONSTRAINT "productos_organizacion_id_organizaciones_id_fk" FOREIGN KEY ("organizacion_id") REFERENCES "public"."organizaciones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "productos" ADD CONSTRAINT "productos_categoria_id_categorias_producto_id_fk" FOREIGN KEY ("categoria_id") REFERENCES "public"."categorias_producto"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "productos" ADD CONSTRAINT "productos_unidad_medida_id_unidades_medida_id_fk" FOREIGN KEY ("unidad_medida_id") REFERENCES "public"."unidades_medida"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proveedores" ADD CONSTRAINT "proveedores_organizacion_id_organizaciones_id_fk" FOREIGN KEY ("organizacion_id") REFERENCES "public"."organizaciones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "secuencias_documento" ADD CONSTRAINT "secuencias_documento_organizacion_id_organizaciones_id_fk" FOREIGN KEY ("organizacion_id") REFERENCES "public"."organizaciones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tokens_renovacion" ADD CONSTRAINT "tokens_renovacion_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unidades_medida" ADD CONSTRAINT "unidades_medida_organizacion_id_organizaciones_id_fk" FOREIGN KEY ("organizacion_id") REFERENCES "public"."organizaciones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_organizacion_id_organizaciones_id_fk" FOREIGN KEY ("organizacion_id") REFERENCES "public"."organizaciones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_organizacion_id_organizaciones_id_fk" FOREIGN KEY ("organizacion_id") REFERENCES "public"."organizaciones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_almacen_id_almacenes_id_fk" FOREIGN KEY ("almacen_id") REFERENCES "public"."almacenes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "almacenes_org_codigo_uq" ON "almacenes" USING btree ("organizacion_id","codigo");--> statement-breakpoint
CREATE INDEX "auditoria_org_fecha_idx" ON "auditoria" USING btree ("organizacion_id","created_at");--> statement-breakpoint
CREATE INDEX "auditoria_registro_idx" ON "auditoria" USING btree ("tabla_afectada","registro_id");--> statement-breakpoint
CREATE UNIQUE INDEX "categorias_producto_org_nombre_uq" ON "categorias_producto" USING btree ("organizacion_id","nombre");--> statement-breakpoint
CREATE INDEX "clientes_fase1_org_nombre_idx" ON "clientes" USING btree ("organizacion_id","nombre");--> statement-breakpoint
CREATE UNIQUE INDEX "clientes_fase1_org_nit_ci_uq" ON "clientes" USING btree ("organizacion_id","nit_ci");--> statement-breakpoint
CREATE UNIQUE INDEX "compras_org_numero_factura_uq" ON "compras" USING btree ("organizacion_id","numero_factura");--> statement-breakpoint
CREATE INDEX "compras_org_fecha_idx" ON "compras" USING btree ("organizacion_id","fecha");--> statement-breakpoint
CREATE INDEX "detalle_compra_compra_idx" ON "detalle_compra" USING btree ("compra_id");--> statement-breakpoint
CREATE INDEX "detalle_venta_venta_idx" ON "detalle_venta" USING btree ("venta_id");--> statement-breakpoint
CREATE INDEX "existencias_almacen_org_idx" ON "existencias_almacen" USING btree ("organizacion_id");--> statement-breakpoint
CREATE UNIQUE INDEX "lotes_producto_almacen_numero_uq" ON "lotes_producto" USING btree ("producto_id","almacen_id","numero_lote");--> statement-breakpoint
CREATE INDEX "lotes_producto_vencimiento_idx" ON "lotes_producto" USING btree ("fecha_vencimiento");--> statement-breakpoint
CREATE INDEX "movimientos_inventario_fase1_producto_fecha_idx" ON "movimientos_inventario" USING btree ("organizacion_id","producto_id","created_at");--> statement-breakpoint
CREATE INDEX "movimientos_inventario_fase1_referencia_idx" ON "movimientos_inventario" USING btree ("referencia_tipo","referencia_id");--> statement-breakpoint
CREATE INDEX "movimientos_inventario_fase1_parcela_idx" ON "movimientos_inventario" USING btree ("parcela_id");--> statement-breakpoint
CREATE INDEX "pagos_venta_venta_idx" ON "pagos_venta" USING btree ("venta_id");--> statement-breakpoint
CREATE UNIQUE INDEX "productos_fase1_org_sku_uq" ON "productos" USING btree ("organizacion_id","sku");--> statement-breakpoint
CREATE UNIQUE INDEX "productos_fase1_org_codigo_barras_uq" ON "productos" USING btree ("organizacion_id","codigo_barras");--> statement-breakpoint
CREATE INDEX "productos_fase1_busqueda_idx" ON "productos" USING btree ("organizacion_id","nombre");--> statement-breakpoint
CREATE INDEX "productos_fase1_categoria_idx" ON "productos" USING btree ("categoria_id");--> statement-breakpoint
CREATE INDEX "proveedores_org_nombre_idx" ON "proveedores" USING btree ("organizacion_id","nombre");--> statement-breakpoint
CREATE UNIQUE INDEX "proveedores_org_nit_uq" ON "proveedores" USING btree ("organizacion_id","nit");--> statement-breakpoint
CREATE UNIQUE INDEX "tokens_renovacion_hash_uq" ON "tokens_renovacion" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "tokens_renovacion_usuario_idx" ON "tokens_renovacion" USING btree ("usuario_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unidades_medida_org_abreviatura_uq" ON "unidades_medida" USING btree ("organizacion_id","abreviatura");--> statement-breakpoint
CREATE UNIQUE INDEX "usuarios_email_uq" ON "usuarios" USING btree ("email");--> statement-breakpoint
CREATE INDEX "usuarios_organizacion_idx" ON "usuarios" USING btree ("organizacion_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ventas_fase1_org_numero_factura_uq" ON "ventas" USING btree ("organizacion_id","numero_factura");--> statement-breakpoint
CREATE INDEX "ventas_fase1_org_fecha_idx" ON "ventas" USING btree ("organizacion_id","fecha");
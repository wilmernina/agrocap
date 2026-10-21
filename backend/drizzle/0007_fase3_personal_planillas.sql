CREATE TYPE cargo_empleado AS ENUM ('capataz','peon','tecnico','chofer','administrativo','otro');
CREATE TYPE tipo_contrato_empleado AS ENUM ('permanente','eventual','temporal');
CREATE TYPE tipo_pago_empleado AS ENUM ('mensual','jornal','destajo');
CREATE TYPE genero_empleado AS ENUM ('femenino','masculino','otro','no_especificado');
CREATE TYPE estado_empleado AS ENUM ('activo','inactivo','vacacion','licencia');
CREATE TYPE tipo_asistencia AS ENUM ('normal','feriado','domingo','licencia','vacacion','falta','permiso');
CREATE TYPE estado_tareo AS ENUM ('pendiente','aprobado','pagado');
CREATE TYPE tipo_periodo_planilla AS ENUM ('mensual','quincenal');
CREATE TYPE estado_periodo_planilla AS ENUM ('abierto','calculado','cerrado','pagado');
CREATE TYPE estado_planilla AS ENUM ('calculado','pagado','anulado');
CREATE TYPE tipo_concepto_planilla AS ENUM ('ingreso','descuento');
CREATE TYPE metodo_pago_planilla AS ENUM ('efectivo','transferencia','cheque','qr','otro');
CREATE TYPE tipo_factura_rc_iva AS ENUM ('compras','servicios','alquiler');
CREATE TYPE tipo_feriado AS ENUM ('nacional','departamental','regional');

CREATE TABLE cargos (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organizacion_id uuid NOT NULL REFERENCES organizaciones(id), nombre varchar(100) NOT NULL,
 descripcion text, salario_base_referencia numeric(12,2) NOT NULL DEFAULT 0, activo boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), CONSTRAINT cargos_org_nombre_uq UNIQUE(organizacion_id,nombre)
);
CREATE TABLE empleados (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organizacion_id uuid NOT NULL REFERENCES organizaciones(id), usuario_id uuid REFERENCES usuarios(id) ON DELETE SET NULL,
 codigo varchar(40) NOT NULL, nombres varchar(120) NOT NULL, apellidos varchar(120) NOT NULL, ci varchar(32) NOT NULL, ci_complemento varchar(8),
 fecha_nacimiento date, genero genero_empleado, telefono varchar(40), email varchar(180), direccion text, ciudad varchar(100),
 cargo cargo_empleado NOT NULL DEFAULT 'otro', cargo_id uuid REFERENCES cargos(id) ON DELETE SET NULL, tipo_contrato tipo_contrato_empleado NOT NULL DEFAULT 'permanente',
 fecha_ingreso date NOT NULL, fecha_baja date, motivo_baja text, salario_base numeric(12,2) NOT NULL DEFAULT 0, tipo_pago tipo_pago_empleado NOT NULL DEFAULT 'mensual', valor_jornal numeric(12,2), banco varchar(100), numero_cuenta varchar(80), afp varchar(100), numero_afp varchar(60), tiene_rc_iva boolean NOT NULL DEFAULT false, estado estado_empleado NOT NULL DEFAULT 'activo', observaciones text,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), CONSTRAINT empleados_org_codigo_uq UNIQUE(organizacion_id,codigo), CONSTRAINT empleados_usuario_uq UNIQUE(usuario_id)
);
CREATE UNIQUE INDEX empleados_org_ci_sin_complemento_uq ON empleados(organizacion_id,ci) WHERE ci_complemento IS NULL;
CREATE UNIQUE INDEX empleados_org_ci_con_complemento_uq ON empleados(organizacion_id,ci,ci_complemento) WHERE ci_complemento IS NOT NULL;
CREATE INDEX empleados_org_estado_idx ON empleados(organizacion_id,estado); CREATE INDEX empleados_org_cargo_idx ON empleados(organizacion_id,cargo);
CREATE TABLE asistencias (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organizacion_id uuid NOT NULL REFERENCES organizaciones(id), empleado_id uuid NOT NULL REFERENCES empleados(id), fecha date NOT NULL,
 hora_entrada time, hora_salida time, horas_trabajadas numeric(7,2) NOT NULL DEFAULT 0, horas_extra numeric(7,2) NOT NULL DEFAULT 0, horas_extra_nocturnas numeric(7,2) NOT NULL DEFAULT 0,
 tipo tipo_asistencia NOT NULL DEFAULT 'normal', parcela_id uuid REFERENCES parcelas(id) ON DELETE SET NULL, actividad_id uuid REFERENCES actividades_campo(id) ON DELETE SET NULL, observaciones text, registrado_por uuid REFERENCES usuarios(id) ON DELETE SET NULL, created_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT asistencias_empleado_fecha_uq UNIQUE(organizacion_id,empleado_id,fecha)
);
CREATE INDEX asistencias_org_fecha_idx ON asistencias(organizacion_id,fecha); CREATE INDEX asistencias_parcela_fecha_idx ON asistencias(parcela_id,fecha);
CREATE TABLE tareos (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organizacion_id uuid NOT NULL REFERENCES organizaciones(id), empleado_id uuid NOT NULL REFERENCES empleados(id), fecha date NOT NULL, descripcion_tarea text NOT NULL,
 cantidad numeric(14,3) NOT NULL, unidad varchar(30) NOT NULL, precio_unitario numeric(12,2) NOT NULL, subtotal numeric(14,2) NOT NULL, parcela_id uuid REFERENCES parcelas(id) ON DELETE SET NULL,
 aprobado_por uuid REFERENCES usuarios(id) ON DELETE SET NULL, estado estado_tareo NOT NULL DEFAULT 'pendiente', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX tareos_org_estado_fecha_idx ON tareos(organizacion_id,estado,fecha); CREATE INDEX tareos_parcela_fecha_idx ON tareos(parcela_id,fecha);
CREATE TABLE periodos_planilla (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organizacion_id uuid NOT NULL REFERENCES organizaciones(id), tipo tipo_periodo_planilla NOT NULL, gestion integer NOT NULL, mes integer NOT NULL CHECK(mes BETWEEN 1 AND 12), quincena integer CHECK(quincena IN (1,2)),
 fecha_inicio date NOT NULL, fecha_fin date NOT NULL, fecha_pago date, estado estado_periodo_planilla NOT NULL DEFAULT 'abierto', calculado_por uuid REFERENCES usuarios(id) ON DELETE SET NULL, cerrado_por uuid REFERENCES usuarios(id) ON DELETE SET NULL, pagado_por uuid REFERENCES usuarios(id) ON DELETE SET NULL, cerrado_en timestamptz, pagado_en timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT periodos_quincena_regla CHECK((tipo='mensual' AND quincena IS NULL) OR (tipo='quincenal' AND quincena IS NOT NULL))
);
CREATE UNIQUE INDEX periodos_planilla_mensual_uq ON periodos_planilla(organizacion_id,gestion,mes) WHERE tipo='mensual';
CREATE UNIQUE INDEX periodos_planilla_quincenal_uq ON periodos_planilla(organizacion_id,gestion,mes,quincena) WHERE tipo='quincenal';
CREATE INDEX periodos_planilla_org_estado_idx ON periodos_planilla(organizacion_id,estado);
CREATE TABLE planillas (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organizacion_id uuid NOT NULL REFERENCES organizaciones(id), periodo_id uuid NOT NULL REFERENCES periodos_planilla(id), empleado_id uuid NOT NULL REFERENCES empleados(id), salario_base numeric(12,2) NOT NULL, dias_trabajados numeric(6,2) NOT NULL DEFAULT 0,
 monto_ganado numeric(14,2) NOT NULL DEFAULT 0, horas_extra_monto numeric(14,2) NOT NULL DEFAULT 0, bono_antiguedad numeric(14,2) NOT NULL DEFAULT 0, bono_produccion numeric(14,2) NOT NULL DEFAULT 0, otros_bonos jsonb NOT NULL DEFAULT '[]', total_ganado numeric(14,2) NOT NULL DEFAULT 0,
 aporte_afp numeric(14,2) NOT NULL DEFAULT 0, aporte_afp_comision numeric(14,2) NOT NULL DEFAULT 0, rc_iva numeric(14,2) NOT NULL DEFAULT 0, aporte_solidario numeric(14,2) NOT NULL DEFAULT 0, otros_descuentos jsonb NOT NULL DEFAULT '[]', total_descuentos numeric(14,2) NOT NULL DEFAULT 0, liquido_pagable numeric(14,2) NOT NULL DEFAULT 0,
 estado estado_planilla NOT NULL DEFAULT 'calculado', fecha_pago date, metodo_pago metodo_pago_planilla, referencia_pago varchar(120), asiento_contable_id uuid, planilla_complementaria_de uuid, calculado_por uuid REFERENCES usuarios(id) ON DELETE SET NULL, pagado_por uuid REFERENCES usuarios(id) ON DELETE SET NULL, observaciones text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT planilla_complementaria_fk FOREIGN KEY(planilla_complementaria_de) REFERENCES planillas(id) ON DELETE SET NULL
);
CREATE UNIQUE INDEX planillas_periodo_empleado_base_uq ON planillas(periodo_id,empleado_id) WHERE planilla_complementaria_de IS NULL;
CREATE INDEX planillas_org_periodo_idx ON planillas(organizacion_id,periodo_id); CREATE INDEX planillas_empleado_idx ON planillas(empleado_id);
CREATE TABLE detalle_planilla_conceptos (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organizacion_id uuid NOT NULL REFERENCES organizaciones(id), planilla_id uuid NOT NULL REFERENCES planillas(id) ON DELETE CASCADE, tipo tipo_concepto_planilla NOT NULL, concepto varchar(160) NOT NULL, monto numeric(14,2) NOT NULL, orden integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX detalle_planilla_conceptos_planilla_idx ON detalle_planilla_conceptos(planilla_id,orden);
CREATE TABLE boletas_pago (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organizacion_id uuid NOT NULL REFERENCES organizaciones(id), planilla_id uuid NOT NULL REFERENCES planillas(id), numero_boleta varchar(60) NOT NULL, archivo_pdf_url text, generado_por uuid REFERENCES usuarios(id) ON DELETE SET NULL, created_at timestamptz NOT NULL DEFAULT now(), CONSTRAINT boletas_pago_org_numero_uq UNIQUE(organizacion_id,numero_boleta), CONSTRAINT boletas_pago_planilla_uq UNIQUE(planilla_id)
);
CREATE TABLE configuracion_laboral (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organizacion_id uuid NOT NULL REFERENCES organizaciones(id), gestion integer NOT NULL, salario_minimo_nacional numeric(12,2) NOT NULL, aporte_afp_laboral numeric(6,3) NOT NULL, aporte_afp_patronal numeric(6,3) NOT NULL, comision_afp numeric(6,3) NOT NULL, tasa_rc_iva numeric(6,3) NOT NULL, umbral_aporte_solidario numeric(12,2) NOT NULL, porcentaje_aporte_solidario jsonb NOT NULL DEFAULT '[]', horas_mes_base integer NOT NULL DEFAULT 240, dias_mes_base integer NOT NULL DEFAULT 30, recargo_hora_extra numeric(6,3) NOT NULL DEFAULT 1, recargo_nocturno numeric(6,3) NOT NULL DEFAULT 0.5, recargo_dominical numeric(6,3) NOT NULL DEFAULT 1, activo boolean NOT NULL DEFAULT true, fuente_normativa text, created_at timestamptz NOT NULL DEFAULT now(), CONSTRAINT configuracion_laboral_org_gestion_uq UNIQUE(organizacion_id,gestion)
);
CREATE INDEX configuracion_laboral_org_activo_idx ON configuracion_laboral(organizacion_id,activo);
CREATE TABLE feriados (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organizacion_id uuid NOT NULL REFERENCES organizaciones(id), fecha date NOT NULL, nombre varchar(160) NOT NULL, tipo tipo_feriado NOT NULL DEFAULT 'nacional', departamento varchar(100), activo boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), CONSTRAINT feriados_org_fecha_nombre_uq UNIQUE(organizacion_id,fecha,nombre)
);
CREATE INDEX feriados_org_fecha_idx ON feriados(organizacion_id,fecha);
CREATE TABLE facturas_rc_iva (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organizacion_id uuid NOT NULL REFERENCES organizaciones(id), planilla_id uuid NOT NULL REFERENCES planillas(id) ON DELETE CASCADE, empleado_id uuid NOT NULL REFERENCES empleados(id), numero_factura varchar(80) NOT NULL, nit_proveedor varchar(40), razon_social varchar(180), monto numeric(14,2) NOT NULL, fecha date NOT NULL, tipo tipo_factura_rc_iva NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX facturas_rc_iva_planilla_idx ON facturas_rc_iva(planilla_id); CREATE INDEX facturas_rc_iva_empleado_fecha_idx ON facturas_rc_iva(empleado_id,fecha);

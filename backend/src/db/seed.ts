import { and, eq, sql } from 'drizzle-orm';
import { closeDatabase, db } from './index.ts';
import {
  almacenes,
  categoriasProducto,
  clientes,
  detalleVenta,
  existenciasAlmacen,
  lotesProducto,
  movimientosInventario,
  organizaciones,
  productos,
  proveedores,
  pagosVenta,
  unidadesMedida,
  usuarios,
  ventas,
} from './schema-fase1.ts';
import { generarPasswordHash } from '../shared/password.ts';
import { empleados, cargos, configuracionLaboral, feriados } from './schema-fase3.ts';

const correoAdministrador = 'admin@agrocap.bo';
const passwordAdministrador = 'AgroSys2026!';

async function ejecutarSeed() {
  const passwordHash = await generarPasswordHash(passwordAdministrador);

  await db.transaction(async (tx) => {
    let [organizacion] = await tx.select().from(organizaciones)
      .where(eq(organizaciones.nombre, 'AgroCAP')).limit(1);
    if (!organizacion) {
      [organizacion] = await tx.insert(organizaciones).values({
        nombre: 'AgroCAP', nit: '1020304012', moneda: 'BOB', zonaHoraria: 'America/La_Paz',
      }).returning();
    }

    let [administrador] = await tx.select().from(usuarios)
      .where(eq(usuarios.email, correoAdministrador)).limit(1);
    if (!administrador) {
      [administrador] = await tx.insert(usuarios).values({
        organizacionId: organizacion.id,
        nombre: 'Administrador AgroCAP',
        email: correoAdministrador,
        passwordHash,
        rol: 'admin',
      }).returning();
    }

    const categoriasSeed = [
      { nombre: 'Fertilizantes', descripcion: 'Fertilizantes granulados, foliares y correctores de suelo.' },
      { nombre: 'Herbicidas', descripcion: 'Productos para el control de malezas.' },
      { nombre: 'Semillas', descripcion: 'Semillas certificadas para cultivos agrícolas.' },
      { nombre: 'Fungicidas e insecticidas', descripcion: 'Productos para el manejo fitosanitario.' },
      { nombre: 'Herramientas', descripcion: 'Herramientas y equipos menores para campo.' },
    ];
    const categorias = new Map<string, typeof categoriasProducto.$inferSelect>();
    for (const item of categoriasSeed) {
      let [fila] = await tx.select().from(categoriasProducto).where(and(
        eq(categoriasProducto.organizacionId, organizacion.id), eq(categoriasProducto.nombre, item.nombre),
      )).limit(1);
      if (!fila) [fila] = await tx.insert(categoriasProducto).values({ organizacionId: organizacion.id, ...item }).returning();
      categorias.set(item.nombre, fila);
    }

    const unidadesSeed = [
      { nombre: 'Kilogramo', abreviatura: 'kg' },
      { nombre: 'Litro', abreviatura: 'lt' },
      { nombre: 'Saco', abreviatura: 'saco' },
      { nombre: 'Unidad', abreviatura: 'unid.' },
    ];
    const unidades = new Map<string, typeof unidadesMedida.$inferSelect>();
    for (const item of unidadesSeed) {
      let [fila] = await tx.select().from(unidadesMedida).where(and(
        eq(unidadesMedida.organizacionId, organizacion.id), eq(unidadesMedida.abreviatura, item.abreviatura),
      )).limit(1);
      if (!fila) [fila] = await tx.insert(unidadesMedida).values({ organizacionId: organizacion.id, ...item }).returning();
      unidades.set(item.abreviatura, fila);
    }

    let [almacen] = await tx.select().from(almacenes).where(and(
      eq(almacenes.organizacionId, organizacion.id), eq(almacenes.codigo, 'CENTRAL'),
    )).limit(1);
    if (!almacen) {
      [almacen] = await tx.insert(almacenes).values({
        organizacionId: organizacion.id,
        codigo: 'CENTRAL',
        nombre: 'Almacén central',
        direccion: 'Santa Cruz de la Sierra, Bolivia',
      }).returning();
    }

    const proveedoresSeed = [
      { nombre: 'Agroinsumos del Oriente S.R.L.', nit: '1029384011', telefono: '33600001', email: 'ventas@agrooriente.test', direccion: 'Av. Virgen de Cotoca, Santa Cruz', contacto: 'María Suárez' },
      { nombre: 'Semillas Bolivia S.A.', nit: '2048576018', telefono: '33400002', email: 'pedidos@semillasbolivia.test', direccion: 'Parque Industrial, Santa Cruz', contacto: 'Carlos Rojas' },
    ];
    const proveedoresCreados = new Map<string, typeof proveedores.$inferSelect>();
    for (const item of proveedoresSeed) {
      let [fila] = await tx.select().from(proveedores).where(and(
        eq(proveedores.organizacionId, organizacion.id), eq(proveedores.nit, item.nit),
      )).limit(1);
      if (!fila) [fila] = await tx.insert(proveedores).values({ organizacionId: organizacion.id, ...item }).returning();
      proveedoresCreados.set(item.nit, fila);
    }

    const clientesSeed = [
      { nombre: 'Consumidor final', nitCi: '0', tipo: 'externo' as const, limiteCredito: '0' },
      { nombre: 'Asociación de Productores El Porvenir', nitCi: '4567890012', telefono: '70010001', email: 'contacto@elporvenir.test', direccion: 'Cuatro Cañadas, Santa Cruz', tipo: 'socio' as const, limiteCredito: '15000.00' },
      { nombre: 'Finca La Esperanza', nitCi: '7845123', telefono: '71020002', direccion: 'Montero, Santa Cruz', tipo: 'externo' as const, limiteCredito: '5000.00' },
    ];
    for (const item of clientesSeed) {
      const [existente] = await tx.select({ id: clientes.id }).from(clientes).where(and(
        eq(clientes.organizacionId, organizacion.id), eq(clientes.nitCi, item.nitCi),
      )).limit(1);
      if (!existente) await tx.insert(clientes).values({ organizacionId: organizacion.id, ...item });
    }

    const productosSeed = [
      { sku: 'FERT-UREA-46', codigoBarras: '7770001000011', nombre: 'Urea granulada 46-0-0', descripcion: 'Fertilizante nitrogenado en saco de 50 kg.', categoria: 'Fertilizantes', unidad: 'saco', tipo: 'fertilizante' as const, precioCosto: '255.00', precioVenta: '295.00', stockInicial: '40.000', stockMinimo: '10.000', stockMaximo: '120.000', lote: 'UR-2026-001', vencimiento: '2028-03-31', proveedorNit: '1029384011' },
      { sku: 'FERT-DAP-1846', codigoBarras: '7770001000028', nombre: 'Fosfato diamónico DAP 18-46-0', descripcion: 'Fertilizante fosfatado en saco de 50 kg.', categoria: 'Fertilizantes', unidad: 'saco', tipo: 'fertilizante' as const, precioCosto: '390.00', precioVenta: '445.00', stockInicial: '25.000', stockMinimo: '8.000', stockMaximo: '80.000', lote: 'DAP-2026-004', vencimiento: '2028-06-30', proveedorNit: '1029384011' },
      { sku: 'HERB-GLIF-48', codigoBarras: '7770001000035', nombre: 'Glifosato 48%', descripcion: 'Herbicida sistémico, presentación de 20 litros.', categoria: 'Herbicidas', unidad: 'lt', tipo: 'herbicida' as const, precioCosto: '37.50', precioVenta: '45.00', stockInicial: '180.000', stockMinimo: '40.000', stockMaximo: '400.000', lote: 'GLI-260115', vencimiento: '2028-01-15', proveedorNit: '1029384011', requiereReceta: true },
      { sku: 'SEM-SOYA-INIAF', codigoBarras: '7770001000042', nombre: 'Semilla certificada de soya INIAF', descripcion: 'Semilla tratada, bolsa de 40 kg, adaptada a condiciones del oriente boliviano.', categoria: 'Semillas', unidad: 'saco', tipo: 'semilla' as const, precioCosto: '410.00', precioVenta: '475.00', stockInicial: '32.000', stockMinimo: '10.000', stockMaximo: '100.000', lote: 'SOY-INIAF-26A', vencimiento: '2027-08-31', proveedorNit: '2048576018' },
      { sku: 'FUNG-AZOX-250', codigoBarras: '7770001000059', nombre: 'Azoxistrobina 250 SC', descripcion: 'Fungicida sistémico para enfermedades foliares.', categoria: 'Fungicidas e insecticidas', unidad: 'lt', tipo: 'fungicida' as const, precioCosto: '185.00', precioVenta: '225.00', stockInicial: '24.000', stockMinimo: '6.000', stockMaximo: '60.000', lote: 'AZO-2026-07', vencimiento: '2028-07-31', proveedorNit: '1029384011', requiereReceta: true },
      { sku: 'HERR-MOCH-20', codigoBarras: '7770001000066', nombre: 'Mochila pulverizadora 20 L', descripcion: 'Pulverizadora manual con lanza y boquilla regulable.', categoria: 'Herramientas', unidad: 'unid.', tipo: 'herramienta' as const, precioCosto: '310.00', precioVenta: '380.00', stockInicial: '12.000', stockMinimo: '3.000', stockMaximo: '30.000', proveedorNit: '1029384011' },
    ];

    for (const item of productosSeed) {
      const [existente] = await tx.select().from(productos).where(and(
        eq(productos.organizacionId, organizacion.id), eq(productos.sku, item.sku),
      )).limit(1);
      if (existente) continue;

      const categoria = categorias.get(item.categoria);
      const unidad = unidades.get(item.unidad);
      const proveedor = proveedoresCreados.get(item.proveedorNit);
      if (!categoria || !unidad || !proveedor) throw new Error(`Catálogo incompleto para ${item.sku}`);

      const [producto] = await tx.insert(productos).values({
        organizacionId: organizacion.id,
        sku: item.sku,
        codigoBarras: item.codigoBarras,
        nombre: item.nombre,
        descripcion: item.descripcion,
        categoriaId: categoria.id,
        unidadMedidaId: unidad.id,
        tipo: item.tipo,
        precioCosto: item.precioCosto,
        precioVenta: item.precioVenta,
        stockActual: item.stockInicial,
        stockMinimo: item.stockMinimo,
        stockMaximo: item.stockMaximo,
        requiereReceta: item.requiereReceta ?? false,
      }).returning();

      await tx.insert(existenciasAlmacen).values({
        organizacionId: organizacion.id, almacenId: almacen.id, productoId: producto.id, cantidad: item.stockInicial,
      });
      let loteId: string | undefined;
      if (item.lote && item.vencimiento) {
        const [lote] = await tx.insert(lotesProducto).values({
          organizacionId: organizacion.id,
          productoId: producto.id,
          almacenId: almacen.id,
          numeroLote: item.lote,
          fechaVencimiento: item.vencimiento,
          cantidadInicial: item.stockInicial,
          cantidadActual: item.stockInicial,
          proveedorId: proveedor.id,
        }).returning({ id: lotesProducto.id });
        loteId = lote.id;
      }
      await tx.insert(movimientosInventario).values({
        organizacionId: organizacion.id,
        productoId: producto.id,
        almacenId: almacen.id,
        loteProductoId: loteId,
        tipo: 'entrada',
        cantidad: item.stockInicial,
        stockAnterior: '0.000',
        stockNuevo: item.stockInicial,
        motivo: 'Existencia inicial creada por el seed',
        referenciaTipo: 'seed',
        referenciaId: producto.id,
        usuarioId: administrador.id,
      });
    }

    const numeroVentaDemo = 'V-SEED-0001';
    const [ventaExistente] = await tx.select({ id: ventas.id }).from(ventas).where(and(
      eq(ventas.organizacionId, organizacion.id), eq(ventas.numeroFactura, numeroVentaDemo),
    )).limit(1);
    if (!ventaExistente) {
      const [clienteDemo] = await tx.select().from(clientes).where(and(
        eq(clientes.organizacionId, organizacion.id), eq(clientes.nitCi, '4567890012'),
      )).limit(1);
      const lineasDemo = [];
      for (const sku of ['FERT-UREA-46', 'SEM-SOYA-INIAF']) {
        const [producto] = await tx.select().from(productos).where(and(
          eq(productos.organizacionId, organizacion.id), eq(productos.sku, sku),
        )).limit(1);
        if (!producto) throw new Error(`No se encontró ${sku} para la venta de demostración`);
        lineasDemo.push({ producto, cantidad: sku === 'FERT-UREA-46' ? 2 : 1 });
      }

      const [venta] = await tx.insert(ventas).values({
        organizacionId: organizacion.id,
        almacenId: almacen.id,
        numeroFactura: numeroVentaDemo,
        clienteId: clienteDemo?.id,
        subtotal: '1065.00',
        descuento: '15.00',
        impuestos: '0.00',
        total: '1050.00',
        tipoPago: 'contado',
        estado: 'pagada',
        observaciones: 'Venta de demostración creada por el seed',
        usuarioId: administrador.id,
      }).returning();

      for (const { producto, cantidad } of lineasDemo) {
        const stockAnterior = Number(producto.stockActual);
        const stockNuevo = stockAnterior - cantidad;
        const descuentoLinea = producto.sku === 'FERT-UREA-46' ? 15 : 0;
        await tx.insert(detalleVenta).values({
          ventaId: venta.id,
          productoId: producto.id,
          cantidad: cantidad.toFixed(3),
          precioUnitario: producto.precioVenta,
          descuento: descuentoLinea.toFixed(2),
          subtotal: (cantidad * Number(producto.precioVenta) - descuentoLinea).toFixed(2),
        });
        await tx.update(productos).set({ stockActual: stockNuevo.toFixed(3), updatedAt: new Date() })
          .where(eq(productos.id, producto.id));
        await tx.update(existenciasAlmacen).set({ cantidad: stockNuevo.toFixed(3), updatedAt: new Date() }).where(and(
          eq(existenciasAlmacen.almacenId, almacen.id), eq(existenciasAlmacen.productoId, producto.id),
        ));
        await tx.insert(movimientosInventario).values({
          organizacionId: organizacion.id,
          productoId: producto.id,
          almacenId: almacen.id,
          tipo: 'salida',
          cantidad: cantidad.toFixed(3),
          stockAnterior: stockAnterior.toFixed(3),
          stockNuevo: stockNuevo.toFixed(3),
          motivo: 'Venta pagada de demostración',
          referenciaTipo: 'venta',
          referenciaId: venta.id,
          usuarioId: administrador.id,
        });
      }
      await tx.insert(pagosVenta).values({
        organizacionId: organizacion.id,
        ventaId: venta.id,
        monto: '1050.00',
        metodoPago: 'qr',
        referencia: 'SEED-QR-0001',
        usuarioId: administrador.id,
      });
    }

    await tx.execute(sql`
      INSERT INTO cultivos (organizacion_id, nombre_comun, nombre_cientifico, variedad, tipo, ciclo_dias)
      VALUES
        (${organizacion.id}, 'Soya', 'Glycine max', 'INIAF', 'granos', 120),
        (${organizacion.id}, 'Papa', 'Solanum tuberosum', 'Waycha', 'hortalizas', 150),
        (${organizacion.id}, 'Maíz', 'Zea mays', 'Aychasara', 'granos', 150)
      ON CONFLICT (organizacion_id, nombre_comun, variedad) DO NOTHING
    `);

    await tx.execute(sql`
      WITH finca AS (
        INSERT INTO fincas (organizacion_id, nombre, propietario_id, direccion, municipio, departamento)
        VALUES (${organizacion.id}, 'Finca Demostrativa Santa Cruz', ${administrador.id}, 'Zona rural de Cuatro Cañadas', 'Cuatro Cañadas', 'Santa Cruz')
        ON CONFLICT (organizacion_id, nombre) DO UPDATE SET municipio = excluded.municipio
        RETURNING id
      )
      INSERT INTO parcelas (organizacion_id, finca_id, nombre, codigo, geometria, tipo_suelo, sistema_riego, observaciones)
      SELECT ${organizacion.id}, finca.id, 'Lote Soya Norte', 'SC-SOYA-001',
        ST_GeomFromText('POLYGON((-63.15 -17.70,-63.14 -17.70,-63.14 -17.69,-63.15 -17.69,-63.15 -17.70))', 4326),
        'Franco arcilloso', 'Lluvia', 'Parcela demostrativa de soya en el oriente boliviano'
      FROM finca
      ON CONFLICT (organizacion_id, codigo) DO NOTHING
    `);

    await tx.execute(sql`
      WITH finca AS (
        INSERT INTO fincas (organizacion_id, nombre, propietario_id, direccion, municipio, departamento)
        VALUES (${organizacion.id}, 'Finca Demostrativa Cochabamba', ${administrador.id}, 'Zona rural de Tiquipaya', 'Tiquipaya', 'Cochabamba')
        ON CONFLICT (organizacion_id, nombre) DO UPDATE SET municipio = excluded.municipio
        RETURNING id
      )
      INSERT INTO parcelas (organizacion_id, finca_id, nombre, codigo, geometria, tipo_suelo, altitud, sistema_riego, observaciones)
      SELECT ${organizacion.id}, finca.id, 'Lote Papa Waycha', 'CB-PAPA-001',
        ST_GeomFromText('POLYGON((-66.16 -17.35,-66.15 -17.35,-66.15 -17.34,-66.16 -17.34,-66.16 -17.35))', 4326),
        'Franco', 2650, 'Aspersión', 'Parcela demostrativa de papa en los valles de Cochabamba'
      FROM finca
      ON CONFLICT (organizacion_id, codigo) DO NOTHING
    `);
    const cargosSeed = [
      { nombre: 'Capataz', referencia: '4200.00' }, { nombre: 'Peón agrícola', referencia: '2750.00' },
      { nombre: 'Técnico agrícola', referencia: '4800.00' }, { nombre: 'Chofer', referencia: '3500.00' },
      { nombre: 'Administrativo', referencia: '4000.00' },
    ];
    for (const cargo of cargosSeed) {
      await tx.insert(cargos).values({ organizacionId: organizacion.id, nombre: cargo.nombre, salarioBaseReferencia: cargo.referencia }).onConflictDoNothing();
    }

    await tx.insert(configuracionLaboral).values([
      { organizacionId: organizacion.id, gestion: 2024, salarioMinimoNacional: '2500.00', aporteAfpLaboral: '12.710', aporteAfpPatronal: '6.710', comisionAfp: '1.710', tasaRcIva: '13.000', umbralAporteSolidario: '13000.00', porcentajeAporteSolidario: [{ desde: 13000, hasta: 25000, porcentaje: 1 }, { desde: 25000, hasta: 35000, porcentaje: 5 }, { desde: 35000, hasta: null, porcentaje: 10 }], fuenteNormativa: 'D.S. 5154 (SMN Bs 2.500); retención SIP laboral 12,71% y aporte patronal SIP 6,71% según APS. Validar con contador.' },
      { organizacionId: organizacion.id, gestion: 2025, salarioMinimoNacional: '2750.00', aporteAfpLaboral: '12.710', aporteAfpPatronal: '6.710', comisionAfp: '1.710', tasaRcIva: '13.000', umbralAporteSolidario: '13000.00', porcentajeAporteSolidario: [{ desde: 13000, hasta: 25000, porcentaje: 1 }, { desde: 25000, hasta: 35000, porcentaje: 5 }, { desde: 35000, hasta: null, porcentaje: 10 }], fuenteNormativa: 'D.S. 5383 (SMN Bs 2.750); retención SIP laboral 12,71% y aporte patronal SIP 6,71% según APS. Validar con contador.' },
    ]).onConflictDoNothing();

    const feriadosSeed = [
      ['2024-01-01','Año Nuevo'], ['2024-01-22','Día de la Creación del Estado Plurinacional'], ['2024-02-12','Lunes de Carnaval'], ['2024-02-13','Martes de Carnaval'], ['2024-03-29','Viernes Santo'], ['2024-05-01','Día del Trabajo'], ['2024-05-30','Corpus Christi'], ['2024-06-21','Año Nuevo Andino Amazónico Chaqueño'], ['2024-08-06','Día de la Independencia'], ['2024-11-02','Día de Todos los Difuntos'], ['2024-12-25','Navidad'],
      ['2025-01-01','Año Nuevo'], ['2025-01-22','Día de la Creación del Estado Plurinacional'], ['2025-03-03','Lunes de Carnaval'], ['2025-03-04','Martes de Carnaval'], ['2025-04-18','Viernes Santo'], ['2025-05-01','Día del Trabajo'], ['2025-06-19','Corpus Christi'], ['2025-06-21','Año Nuevo Andino Amazónico Chaqueño'], ['2025-08-06','Día de la Independencia'], ['2025-08-07','Feriado excepcional del Bicentenario (D.S. 5438)'], ['2025-11-02','Día de Todos los Difuntos'], ['2025-12-25','Navidad'],
    ] as const;
    await tx.insert(feriados).values(feriadosSeed.map(([fecha, nombre]) => ({ organizacionId: organizacion.id, fecha, nombre, tipo: 'nacional' as const }))).onConflictDoNothing();
    const efemeridesDepartamentales = [
      { departamento: 'Oruro', fecha: '-02-10', nombre: 'Efeméride de Oruro' }, { departamento: 'Chuquisaca', fecha: '-05-25', nombre: 'Efeméride de Chuquisaca' },
      { departamento: 'La Paz', fecha: '-07-16', nombre: 'Efeméride de La Paz' }, { departamento: 'Cochabamba', fecha: '-09-14', nombre: 'Efeméride de Cochabamba' },
      { departamento: 'Santa Cruz', fecha: '-09-24', nombre: 'Efeméride de Santa Cruz' }, { departamento: 'Pando', fecha: '-09-24', nombre: 'Efeméride de Pando' },
      { departamento: 'Potosí', fecha: '-11-10', nombre: 'Efeméride de Potosí' }, { departamento: 'Beni', fecha: '-11-18', nombre: 'Efeméride de Beni' },
      { departamento: 'Tarija', fecha: '-04-15', nombre: 'Efeméride de Tarija' },
    ];
    await tx.insert(feriados).values([2024, 2025].flatMap(gestion => efemeridesDepartamentales.map(item => ({
      organizacionId: organizacion.id, fecha: `${gestion}${item.fecha}`, nombre: item.nombre, tipo: 'departamental' as const, departamento: item.departamento,
    })))).onConflictDoNothing();

    const empleadosSeed = [
      { codigo: 'DEMO-EMP-001', ci: 'DEMO-CI-001', nombres: 'María Elena', apellidos: 'Quispe Rojas', cargo: 'capataz' as const, salarioBase: '4200.00', fechaIngreso: '2022-03-01' },
      { codigo: 'DEMO-EMP-002', ci: 'DEMO-CI-002', nombres: 'Juan Carlos', apellidos: 'Mamani Flores', cargo: 'peon' as const, salarioBase: '2750.00', fechaIngreso: '2024-01-15' },
      { codigo: 'DEMO-EMP-003', ci: 'DEMO-CI-003', nombres: 'Ana Patricia', apellidos: 'Vargas Soria', cargo: 'tecnico' as const, salarioBase: '4800.00', fechaIngreso: '2023-06-01' },
    ];
    for (const empleado of empleadosSeed) {
      await tx.insert(empleados).values({ organizacionId: organizacion.id, ...empleado, tipoContrato: 'permanente', tipoPago: 'mensual', estado: 'activo', afp: 'Gestora Pública' }).onConflictDoNothing();
    }
  });

  console.log('Datos de prueba listos.');
  console.log(`Acceso: ${correoAdministrador} / ${passwordAdministrador}`);
}

ejecutarSeed()
  .catch((error) => { console.error('No se pudo ejecutar el seed:', error); process.exitCode = 1; })
  .finally(() => closeDatabase());

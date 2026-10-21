# Parte 5 — reportes, datos de prueba y tests

## Reportes

Todos los endpoints requieren `Authorization: Bearer <accessToken>` y limitan la información a la organización del usuario autenticado.

- `GET /api/v1/reportes/ventas-periodo?desde=2026-10-01&hasta=2026-10-31`: detalle de ventas confirmadas o pagadas, cobros, saldos y resumen del periodo. La fecha final incluye todo el día.
- `GET /api/v1/reportes/productos-mas-vendidos?desde=&hasta=&limite=10`: ranking por cantidad, importe vendido y número de ventas.
- `GET /api/v1/reportes/stock-valorizado`: stock activo valorizado a costo y precio de venta.
- `GET /api/v1/reportes/kardex/:productoId?desde=&hasta=&almacenId=`: producto y secuencia cronológica de movimientos.

## Seed idempotente

Ejecutar desde la raíz:

```bash
npm run seed --workspace=backend
```

El comando puede repetirse sin duplicar información. Crea o completa:

- organización, administrador y almacén central;
- categorías y unidades de medida;
- clientes y proveedores de demostración;
- urea, DAP, glifosato, semilla de soya, fungicida y mochila pulverizadora;
- existencias, lotes con vencimiento y movimientos iniciales;
- una venta pagada de Bs. 1.050 para alimentar los reportes.

Credenciales:

```text
Usuario: admin@agrocap.bo
Contraseña: AgroSys2026!
```

Los correos `.test`, nombres y documentos de terceros incluidos son datos ficticios de desarrollo.

## Pruebas

```bash
npm run check --workspace=backend
npm test --workspace=backend
```

Las pruebas cubren validaciones de productos, ventas, inventario y reportes; precisión y prohibición de stock negativo; cálculo de totales; control de sobrepagos; bcrypt, JWT y flujo básico de login.

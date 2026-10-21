# Arquitectura

```text
React/Vite → API /api/v1 → routes → controllers → services → repositories → PostgreSQL/PostGIS
                                      │              │
                                      └─ Zod         └─ Drizzle
```

## Dominios

- Identidad: organizaciones, usuarios, roles y sesiones renovables.
- Catálogo: categorías, unidades y productos.
- Terceros: clientes; el patrón permite añadir proveedores.
- Inventario: almacenes, existencias y libro mayor de movimientos.
- Comercial: ventas, líneas, pagos y anulaciones compensatorias.
- Entradas: documentos de ingreso y líneas que incrementan existencias.

Las cantidades y valores monetarios se almacenan como `numeric`, nunca como punto flotante. Los folios se generan por organización y año bajo bloqueo transaccional. La anulación no borra datos: cambia estado y crea movimientos inversos auditables.

## Extensión futura

Cada módulo futuro debe depender del núcleo organizacional, no del módulo de ventas. Por ejemplo, una cosecha podrá generar una entrada usando `reference_type = harvest`; un alquiler podrá generar una venta de servicios sin afectar stock; parcelas usarán columnas `geometry` habilitadas por PostGIS en sus propias migraciones.

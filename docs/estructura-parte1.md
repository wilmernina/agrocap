# AgroCAP — estructura de la Parte 1

```text
systemAgro/
├── backend/
│   ├── drizzle/
│   │   ├── 0000_initial.sql
│   │   ├── 0001_fase1_modelo_completo.sql
│   │   └── meta/
│   ├── src/
│   │   ├── config/
│   │   │   └── env.ts
│   │   └── db/
│   │       ├── index.ts
│   │       ├── schema.ts              # compatibilidad temporal del prototipo
│   │       └── schema-fase1.ts        # modelo objetivo de la Fase 1
│   ├── drizzle.config.ts
│   ├── package.json
│   └── tsconfig.json
├── frontend/                          # se desarrollará desde la Parte 6
├── docs/
├── .env.example
├── docker-compose.yml
├── package.json
└── README.md
```

## Límites de esta parte

La migración `0001_fase1_modelo_completo.sql` crea el modelo definitivo en español. Las tablas inglesas de la migración inicial se conservan temporalmente porque sostienen el prototipo que ya estaba ejecutándose. Se retirarán mediante una migración explícita cuando los módulos de las Partes 2–4 hayan sido adaptados, evitando una interrupción innecesaria durante la entrega incremental.

## Decisiones del modelo

- UUID para identificadores públicos y referencias genéricas.
- `organizacion_id` para aislamiento multiempresa desde el inicio.
- Valores monetarios `numeric(12,2)` y cantidades `numeric(14,3)`.
- Existencias por almacén más `stock_actual` materializado en productos.
- Libro mayor de inventario inmutable con stock anterior y nuevo.
- Lotes por producto y almacén, con vencimiento y proveedor.
- `parcela_id` y `orden_servicio_id` sin clave foránea hasta que existan esos módulos.
- Soft delete mediante `activo` en catálogos principales.
- Restricciones `CHECK`, índices de búsqueda e índices de referencias.

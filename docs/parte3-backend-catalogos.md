# Parte 3 — catálogos y terceros

Todos los endpoints requieren un access token y aíslan los datos mediante `organizacion_id`.

## Productos

- `GET /api/v1/productos`
- `GET /api/v1/productos/alertas-stock`
- `GET /api/v1/productos/:id`
- `POST /api/v1/productos`
- `PUT /api/v1/productos/:id`
- `DELETE /api/v1/productos/:id`

Filtros: `pagina`, `limite`, `busqueda`, `categoria`, `tipo`, `activo` y `stock_bajo`. La búsqueda comprende nombre, SKU y código de barras. El stock no se modifica desde este CRUD; corresponde exclusivamente al módulo de inventario.

## Categorías y unidades

- CRUD `/api/v1/categorias`
- CRUD `/api/v1/unidades-medida`

## Clientes y proveedores

- CRUD `/api/v1/clientes`
- CRUD `/api/v1/proveedores`

Los listados aceptan `pagina`, `limite`, `busqueda` y `activo`. La eliminación es lógica. Todas las escrituras se ejecutan en una transacción y generan una fila en `auditoria` con usuario, IP, estado anterior y estado nuevo.

## Permisos

- Lectura: cualquier usuario autenticado.
- Productos/catálogos: `admin` y `almacenero`; desactivación solo `admin`.
- Clientes: `admin` y `vendedor`; desactivación solo `admin`.
- Proveedores: `admin` y `almacenero`; desactivación solo `admin`.

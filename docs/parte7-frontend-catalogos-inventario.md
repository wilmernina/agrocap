# Parte 7 — catálogos e inventario

## Productos

La ruta `/productos` contiene tres pestañas:

- Productos: búsqueda con debounce por nombre, SKU o código de barras; filtros por categoría, tipo, estado y stock bajo; creación, edición y desactivación.
- Categorías: CRUD y búsqueda paginada.
- Unidades: CRUD y búsqueda paginada.

Los formularios usan React Hook Form y Zod. El stock inicial no se modifica desde el formulario del producto: debe registrarse mediante compra o ajuste para conservar el kardex.

## Clientes y proveedores

- `/clientes`: búsqueda, paginación server-side, tipos de cliente, límite de crédito y soft delete.
- `/proveedores`: búsqueda, paginación server-side, contacto comercial y soft delete.

## Inventario

La ruta `/inventario` incluye:

- movimientos paginados con filtros por producto, almacén, tipo y fechas;
- existencias por almacén y alertas visuales bajo el mínimo;
- kardex cronológico por producto;
- ajuste manual de entrada o salida con motivo obligatorio.

Cada ajuste consume `POST /api/v1/inventario/ajuste`, por lo que actualiza existencias, stock global, movimiento y auditoría en una única transacción del backend.

## Permisos visibles

- Admin: todas las acciones y soft delete.
- Almacenero: productos, categorías, unidades, proveedores y ajustes.
- Vendedor: clientes.
- Técnico: consultas de solo lectura.

La autorización definitiva siempre permanece en el backend; ocultar botones en la interfaz es solamente una mejora de experiencia.

# Parte 6 — base del frontend

## Tecnologías configuradas

- React 18, TypeScript y Vite.
- Tailwind CSS con diseño responsive propio basado en primitivas Radix.
- React Router con rutas públicas y protegidas.
- TanStack Query para estado del servidor.
- Zustand para la sesión en memoria.
- React Hook Form y Zod para formularios.
- Sonner para notificaciones.
- Lucide React para iconografía.

## Autenticación

El access token permanece únicamente en memoria. Al recargar la página, el frontend usa la cookie `httpOnly` de refresh para obtener una sesión nueva. Si una solicitud protegida responde `401`, el cliente HTTP intenta una sola renovación y repite la solicitud original.

Flujo:

1. `POST /api/v1/auth/login` inicia sesión.
2. El backend devuelve el access token y establece la cookie segura de refresh.
3. `POST /api/v1/auth/refresh` restaura o renueva la sesión.
4. `POST /api/v1/auth/logout` revoca el refresh token.

Los errores de red, validación y autenticación se muestran en español. Para desarrollo, la API se configura con:

```env
VITE_API_URL=http://localhost:4000/api/v1
```

## Rutas preparadas

- `/login`
- `/`
- `/productos`
- `/clientes`
- `/proveedores`
- `/inventario`
- `/compras`
- `/ventas`
- `/reportes`
- `/configuracion`

Las primeras cuatro pantallas operativas se implementarán en la Parte 7 y las restantes en la Parte 8. En esta parte se dejaron placeholders deliberados para evitar consumir los endpoints heredados en inglés.

## Comandos

```bash
npm run dev --workspace=frontend
npm run check --workspace=frontend
npm test --workspace=frontend
npm run build --workspace=frontend
```

Durante desarrollo, el frontend queda disponible en `http://localhost:5173` y el backend en `http://localhost:4000`.

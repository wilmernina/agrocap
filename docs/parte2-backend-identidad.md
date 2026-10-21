# Parte 2 — identidad, usuarios y seguridad

## Endpoints

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| POST | `/api/v1/auth/login` | Público | Inicia sesión y emite access/refresh token. |
| POST | `/api/v1/auth/refresh` | Cookie | Rota el refresh token y emite una sesión nueva. |
| POST | `/api/v1/auth/logout` | Cookie | Revoca la sesión actual. |
| GET | `/api/v1/auth/me` | Autenticado | Devuelve el usuario y la organización actuales. |
| GET | `/api/v1/usuarios` | Admin | Lista paginada con búsqueda. |
| GET | `/api/v1/usuarios/:id` | Admin | Obtiene un usuario de la organización. |
| POST | `/api/v1/usuarios` | Admin | Crea un usuario. |
| PUT | `/api/v1/usuarios/:id` | Admin | Actualiza datos, rol o contraseña. |
| DELETE | `/api/v1/usuarios/:id` | Admin | Realiza soft delete. |

## Seguridad aplicada

- Contraseñas bcrypt con 12 rondas.
- Access token corto y validado con Zod.
- Refresh token en cookie `httpOnly`, almacenado únicamente mediante SHA-256.
- Rotación transaccional y detección de reutilización del refresh token.
- Aislamiento de consultas mediante `organizacion_id`.
- Roles `admin`, `vendedor`, `tecnico` y `almacenero`.
- Auditoría transaccional para crear, actualizar y desactivar usuarios.
- El usuario administrador no puede desactivarse a sí mismo.
- Los endpoints nunca devuelven `password_hash` ni hashes de sesión.

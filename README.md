# AgroCAP

AgroCAP es el sistema de gestión agropecuaria de AgroCAP Bolivia. Cubre ventas, cobros, compras/ingresos, productos, clientes, proveedores, inventario, finanzas, acopio de granos y gestión de campo.

## Funcionalidad disponible

- Autenticación JWT con access token en memoria y refresh token rotativo en cookie `httpOnly`.
- Usuarios y roles: administrador, vendedor, técnico y almacenero.
- CRUD de categorías, unidades de medida, productos, clientes y proveedores.
- Compras con borrador, confirmación, lotes, vencimientos y anulación.
- Ventas tipo POS, validación de existencias, pagos y reversión de stock.
- Ajustes, movimientos, existencias por almacén y kardex.
- Dashboard con indicadores y gráficos; reportes con exportación CSV y PDF.
- Auditoría, operaciones transaccionales y borrado lógico de catálogos.
- Interfaz responsive, búsquedas con debounce, paginación, skeletons y mensajes en español.
- Acopio de granos: tickets de báscula inmutables, descuentos de calidad, inventario por titular y silo, trazabilidad de lotes, contratos, fijaciones y liquidaciones.
- Agroquímicos e insumos: catálogo de presentaciones y conversiones, lotes con vencimiento/estado/ubicación, reservas, transferencias, devoluciones en cuarentena, conteos, alertas y kardex valorizado. Las ventas asignan lotes FEFO y rechazan lotes vencidos o inmovilizados; las salidas pueden vincularse con cliente, campaña, parcela, ciclo, actividad y orden de trabajo.

## Arquitectura y tecnologías

El backend usa Node.js 24 con TypeScript nativo, Express, Drizzle ORM, PostgreSQL 16/PostGIS, Zod, JWT y bcrypt. Express fue elegido por su ecosistema estable y por hacer explícita la separación `rutas → controladores → servicios → repositorios`.

El frontend usa React 18, Vite, TypeScript, Tailwind CSS, Radix/shadcn, TanStack Query y Table, Zustand, React Hook Form, Zod, Recharts y Lucide.

```text
systemAgro/
├── backend/
│   ├── drizzle/                 # Migraciones SQL versionadas
│   ├── scripts/                 # Migración y seed
│   ├── src/
│   │   ├── config/              # Entorno y base de datos
│   │   ├── db/                  # Esquema Drizzle
│   │   ├── middlewares/         # Auth, validación y errores
│   │   ├── modules/             # Módulos por dominio
│   │   ├── shared/              # Tipos y utilidades
│   │   ├── app.ts
│   │   └── server.ts
│   └── tests/
├── frontend/
│   └── src/
│       ├── components/
│       ├── config/
│       ├── features/
│       ├── hooks/
│       ├── layouts/
│       ├── lib/
│       ├── pages/
│       └── stores/
├── deploy/
│   ├── nginx/agrosys.conf
│   ├── ecosystem.config.cjs
│   ├── backup.sh
│   └── update.sh
├── docker-compose.yml
├── .env.example
└── .env.production.example
```

## Requisitos previos

- Node.js 24 o superior y npm.
- PostgreSQL 16 con PostGIS, instalado localmente o mediante Docker.
- Docker y Docker Compose solo si se usa el entorno de base de datos incluido.

Compruebe las versiones:

```bash
node --version
npm --version
psql --version
```

## Instalación con PostgreSQL ya instalado

1. Cree la base de datos y habilite PostGIS:

```sql
CREATE DATABASE agrosys;
\c agrosys
CREATE EXTENSION IF NOT EXISTS postgis;
```

2. Copie el archivo de entorno. En PowerShell:

```powershell
Copy-Item .env.example .env
```

En Linux/macOS:

```bash
cp .env.example .env
```

3. Edite `.env` y configure su contraseña real sin publicarla en Git:

```dotenv
DATABASE_URL=postgresql://postgres:TU_PASSWORD@localhost:5432/agrosys
```

4. Instale, migre y cargue datos de prueba:

```bash
npm install
npm run migrate
npm run seed
npm run dev
```

## Instalación con Docker

```bash
cp .env.example .env
docker compose up -d
npm install
npm run migrate
npm run seed
npm run dev
```

El Compose de desarrollo crea PostgreSQL/PostGIS con base, usuario y contraseña `agrosys`. Adminer debe usar sistema `PostgreSQL`, servidor `postgres`, usuario `agrosys`, contraseña `agrosys` y base `agrosys`.

## Acceso local

| Servicio | Dirección |
|---|---|
| Aplicación web | `http://localhost:5173` |
| API REST | `http://localhost:4000/api/v1` |
| Estado de la API | `http://localhost:4000/health` |
| Adminer con Docker | `http://localhost:8080` |

Credenciales generadas por el seed:

- Usuario: `admin@agrocap.bo`
- Contraseña: `AgroSys2026!`

Estas credenciales son únicamente para desarrollo o demostración. Cambie la contraseña antes de utilizar datos reales.

## PWA de campo

La PWA web se abre en `/campo-movil` y está habilitada para administradores y técnicos. En Android, abre AgroCAP en Chrome y usa **Instalar aplicación** o **Añadir a pantalla de inicio**. En iPhone/iPad, usa Compartir y luego **Añadir a pantalla de inicio**.

La instalación requiere servir el frontend mediante HTTPS en producción; la geolocalización del navegador requiere un contexto seguro. En desarrollo local funciona con `localhost`. Workbox conserva el shell y recursos estáticos; IndexedDB (idb) conserva catálogos, formularios y capturas. Cada captura usa UUID v7 y estados locales. Al recuperar conexión, asistencia y tareos se envían por lotes; los reintentos usan espera creciente hasta 30 minutos y el servidor devuelve el resultado original para un UUID ya procesado. Background Sync puede reintentar un envío de lote que se interrumpió por red; además, la app sincroniza cuando vuelve a estar abierta y conectada. La autenticación del backend requiere un token de sesión vigente, por lo que una sincronización en segundo plano sin una ventana abierta depende de que el navegador conserve el token incluido en la solicitud.

Las imágenes se reducen en el dispositivo antes de guardarse. La cola y los catálogos pertenecen al navegador/dispositivo y no están cifrados por la aplicación; mantén el dispositivo bajo control y sincroniza los pendientes antes de cambiar de cuenta. La migración `0009_fase4_sync_idempotente.sql` agrega el registro de idempotencia del backend.

Los registros guardan latitud, longitud y precisión GPS. La entrada y la salida tienen coordenadas separadas; los tareos también guardan su ubicación. Las migraciones `0008_fase4_pwa_gps.sql` y `0009_fase4_sync_idempotente.sql` agregan estos campos y el registro de reintentos idempotentes:

```bash
npm run migrate
npm run build
```

La PWA es una aplicación web instalable. La APK de Android se preparará posteriormente como un entregable separado.

## Variables de entorno

| Variable | Uso |
|---|---|
| `NODE_ENV` | `development`, `test` o `production` |
| `PORT` | Puerto interno del backend, por defecto `4000` |
| `DATABASE_URL` | Conexión PostgreSQL completa |
| `JWT_ACCESS_SECRET` | Firma del access token |
| `JWT_REFRESH_SECRET` | Firma del refresh token; debe ser diferente |
| `ACCESS_TOKEN_TTL` | Vigencia del access token, por ejemplo `15m` |
| `REFRESH_TOKEN_TTL_DAYS` | Vigencia del refresh token en días |
| `CORS_ORIGIN` | Origen autorizado del frontend |
| `UPLOADS_DIR` | Directorio local donde se guardan las fotos de campo |
| `VITE_API_URL` | URL absoluta en desarrollo o `/api/v1` en producción |

Genere secretos de producción independientes:

```bash
openssl rand -hex 48
openssl rand -hex 48
```

## Comandos npm

| Comando | Descripción |
|---|---|
| `npm run dev` | Ejecuta backend y frontend con recarga |
| `npm run start` | Inicia el backend en modo producción |
| `npm run build` | Verifica backend y genera `frontend/dist` |
| `npm run preview` | Previsualiza el frontend compilado |
| `npm run check` | Comprueba tipos en ambos workspaces |
| `npm test` | Ejecuta todas las pruebas |
| `npm run migrate` | Aplica migraciones pendientes |
| `npm run seed` | Inserta datos agropecuarios de demostración |
| `npm run deploy:check` | Ejecuta tipos, pruebas y build antes de desplegar |

Las migraciones están versionadas en `backend/drizzle`. No modifique una migración que ya fue aplicada: agregue una nueva. El seed es repetible para desarrollo, pero en producción debe ejecutarse solo si se desean los datos de demostración.

### Acopio de granos

El módulo se abre en `/acopio`. Antes de recibir grano, registre productores, silos y una tabla de calidad aprobada por el administrador. Cada recepción conserva bruto y tara originales; los descuentos se calculan con la tabla elegida y el saldo aceptado crea un lote identificado por titular (empresa o custodia), productor, silo y recepción. Los traslados crean un nuevo tramo de lote con el mismo origen; las mermas y despachos descuentan saldo y quedan en la bitácora.

Para instalar las nuevas tablas en una base existente ejecute `npm run migrate`. Las rutas API se encuentran bajo `/api/v1/acopio` y requieren rol administrador o almacenero según operación.

### Agroquímicos e insumos

El catálogo y sus presentaciones se administran en `/productos`; los lotes, reservas, conteos, traslados, devoluciones y alertas están en `/inventario`. Aplique las migraciones pendientes con `npm run migrate` desde `backend/`. Las ventas de semillas y agroquímicos descuentan un lote vigente en orden FEFO cuando no se indica uno, y bloquean lotes vencidos, bloqueados o en cuarentena. Las salidas vinculadas se registran en `/api/v1/inventario/salidas-vinculadas`.

## API REST

Todas las rutas funcionales se encuentran bajo `/api/v1`. Salvo login y refresh, requieren `Authorization: Bearer <access_token>`.

### Autenticación y usuarios

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/auth/login` | Iniciar sesión |
| POST | `/auth/refresh` | Rotar tokens usando la cookie |
| POST | `/auth/logout` | Revocar la sesión |
| GET | `/auth/me` | Obtener el usuario autenticado |
| GET/POST | `/usuarios` | Listar o crear usuarios |
| GET/PUT/DELETE | `/usuarios/:id` | Consultar, actualizar o desactivar |

### Catálogos y terceros

| Recurso | Operaciones |
|---|---|
| `/categorias` | CRUD y borrado lógico |
| `/unidades-medida` | CRUD |
| `/productos` | CRUD, filtros, búsqueda y paginación |
| `/productos/alertas-stock` | Productos bajo su mínimo |
| `/clientes` | CRUD, búsqueda y paginación |
| `/proveedores` | CRUD, búsqueda y paginación |

### Inventario, compras y ventas

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/inventario/movimientos` | Libro de movimientos filtrable |
| GET | `/inventario/almacenes` | Almacenes disponibles |
| GET | `/inventario/existencias` | Existencias por producto y almacén |
| POST | `/inventario/ajuste` | Ajuste manual con motivo |
| GET/POST | `/compras` | Listar o crear compra |
| GET/PUT | `/compras/:id` | Consultar o editar borrador |
| POST | `/compras/:id/confirmar` | Confirmar e ingresar existencias |
| POST | `/compras/:id/anular` | Anular y revertir existencias |
| GET/POST | `/ventas` | Listar o crear venta |
| GET/PUT | `/ventas/:id` | Consultar o editar borrador |
| POST | `/ventas/:id/confirmar` | Confirmar y descontar existencias |
| POST | `/ventas/:id/pagar` | Registrar un pago |
| POST | `/ventas/:id/anular` | Anular y revertir existencias |

### Reportes

| Método | Ruta |
|---|---|
| GET | `/reportes/ventas-periodo?desde=AAAA-MM-DD&hasta=AAAA-MM-DD` |
| GET | `/reportes/productos-mas-vendidos` |
| GET | `/reportes/stock-valorizado` |
| GET | `/reportes/kardex/:productoId` |

El resumen de indicadores y series del panel se obtiene con `GET /dashboard`.

Los listados aceptan `pagina` y `limite`; cada recurso documenta además sus filtros en los esquemas Zod del módulo correspondiente.

## Reglas principales

- Confirmar una compra o venta genera movimientos y actualiza existencias en una sola transacción.
- Una venta no puede superar el stock disponible.
- Los productos que requieren receta exigen el número correspondiente.
- Los lotes y vencimientos se conservan para trazabilidad.
- Anular una operación confirmada genera el movimiento inverso; no borra el historial.
- Importes y cantidades se almacenan como `numeric`, no como números de punto flotante.
- Los catálogos operativos usan borrado lógico.
- Las escrituras relevantes generan auditoría con usuario, IP y cambios.
- Las referencias polimórficas y los campos opcionales permiten integrar parcelas y órdenes futuras.

## Pruebas

```bash
npm run check
npm test
npm run build
```

Para ejecutar un workspace:

```bash
npm test --workspace=backend
npm test --workspace=frontend
```

## Despliegue en VPS Contabo

La guía asume Ubuntu 24.04 LTS, un dominio apuntando a la IP pública y acceso mediante un usuario con `sudo`. PostgreSQL y la API escucharán únicamente en el servidor; solo SSH, HTTP y HTTPS deben quedar expuestos.

### 1. Preparar el servidor

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y nginx postgresql-16 postgresql-16-postgis-3 postgresql-client-16 curl git build-essential certbot python3-certbot-nginx ufw
```

Instale Node.js 24 desde una fuente compatible con su distribución. Un procedimiento habitual con NodeSource es descargar y revisar el instalador antes de ejecutarlo:

```bash
curl -fsSL https://deb.nodesource.com/setup_24.x -o /tmp/nodesource_setup.sh
sudo -E bash /tmp/nodesource_setup.sh
sudo apt install -y nodejs
node --version
npm --version
sudo npm install -g pm2
```

### 2. Crear PostgreSQL

```bash
sudo -u postgres psql
```

Dentro de `psql`:

```sql
CREATE ROLE agrosys LOGIN;
\password agrosys
CREATE DATABASE agrosys OWNER agrosys;
\c agrosys
CREATE EXTENSION IF NOT EXISTS postgis;
\q
```

Use una contraseña aleatoria y larga. No abra el puerto `5432` en el firewall.

También puedes automatizar la creación idempotente del usuario, la base, PostGIS y todas las tablas desde la raíz del repositorio. Primero crea `.env` como se indica abajo, instala dependencias con `npm ci` y luego ejecuta:

```bash
bash deploy/setup-database.sh
```

El script toma usuario, contraseña, nombre de base y puerto de `DATABASE_URL`, solo acepta PostgreSQL local y aplica las migraciones pendientes sin borrar datos existentes. Requiere PostgreSQL con PostGIS instalado y `sudo` configurado.

### 3. Instalar AgroCAP

```bash
sudo mkdir -p /var/www/agrosys
sudo chown -R "$USER":"$USER" /var/www/agrosys
git clone https://github.com/wilmernina/agrocap.git /var/www/agrosys
cd /var/www/agrosys
cp .env.production.example .env
nano .env
chmod 600 .env
npm ci
npm run migrate
npm run deploy:check
```

En `.env`, sustituya el dominio, la contraseña PostgreSQL y ambos secretos JWT. Use `VITE_API_URL=/api/v1`; así navegador y API comparten origen. `npm run seed` es opcional y solo debe usarse si realmente se requieren datos demo.

La base de datos se entrega junto al código como migraciones versionadas en `backend/drizzle`; `npm run migrate` crea toda la estructura y aplica los cambios en orden, incluida la extensión PostGIS. No se publica un volcado con información real: en un servidor nuevo la base empieza vacía. Si necesita registros de demostración, ejecute opcionalmente `npm run seed` antes de iniciar la API. El seed crea el usuario `admin@agrocap.bo` con contraseña `AgroSys2026!`; cambie esa contraseña inmediatamente y no lo use para datos reales.

Inicie la API:

```bash
pm2 start deploy/ecosystem.config.cjs --env production
pm2 save
pm2 startup systemd
```

El último comando mostrará una orden con `sudo`; ejecútela y vuelva a ejecutar `pm2 save`. Compruebe con `pm2 status` y `pm2 logs agrosys-api`.

### 4. Configurar Nginx

Reemplace `agrocap.ejemplo.com` por su dominio tanto en `.env` como en `deploy/nginx/agrosys.conf`:

```bash
sudo cp deploy/nginx/agrosys.conf /etc/nginx/sites-available/agrosys
sudo ln -s /etc/nginx/sites-available/agrosys /etc/nginx/sites-enabled/agrosys
sudo nginx -t
sudo systemctl reload nginx
```

La configuración sirve `frontend/dist`, redirige rutas React a `index.html` y envía `/api` y `/health` a `127.0.0.1:4000`.

### 5. Firewall y HTTPS

Antes de habilitar UFW, permita SSH:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

Cuando el registro DNS tipo A ya resuelva al VPS:

```bash
sudo certbot --nginx -d agrocap.sudominio.com
sudo certbot renew --dry-run
systemctl status certbot.timer
```

Valide el despliegue:

```bash
curl https://agrocap.sudominio.com/health
pm2 status
sudo nginx -t
```

### 6. Actualizaciones y respaldos

El script de actualización obtiene cambios, instala exactamente el lockfile, verifica, migra, compila y recarga PM2:

```bash
chmod +x deploy/update.sh deploy/backup.sh
./deploy/update.sh
```

Prepare los respaldos:

```bash
sudo mkdir -p /var/backups/agrosys
sudo chown "$USER":"$USER" /var/backups/agrosys
./deploy/backup.sh
```

Para ejecutarlos diariamente a las 02:00, agregue con `crontab -e`:

```cron
0 2 * * * /var/www/agrosys/deploy/backup.sh >> /var/backups/agrosys/backup.log 2>&1
```

El script conserva 14 días de copias en formato personalizado de PostgreSQL. `pg_dump` incluye el esquema y los datos espaciales PostGIS; el servidor de destino debe tener instalada la misma versión principal de PostgreSQL y PostGIS. Para comprobar el archivo, ejecute `pg_restore --list`. Para restaurar, detenga temporalmente la API, haga una copia del estado actual y ejecute:

```bash
pg_restore --clean --if-exists --no-owner --dbname="$DATABASE_URL" /var/backups/agrosys/agrosys_FECHA.dump
```

El respaldo también contiene las geometrías de parcelas, lotes, puntos y fotos. La extensión PostGIS debe estar instalada en el servidor antes de restaurar. Después de una restauración, aplique las migraciones pendientes con `npm run migrate` y verifique las capas espaciales con consultas sobre `parcelas_geometria_gist_idx` y `fotos_campo_ubicacion_gist_idx`.

El mismo script crea un archivo `agrosys_archivos_FECHA.tar.gz` con las fotos locales de `UPLOADS_DIR` y conserva ambos respaldos por 14 días. Restaure las fotos en el directorio configurado antes de volver a habilitar la API:

```bash
mkdir -p /var/www/agrosys/uploads
tar -xzf /var/backups/agrosys/agrosys_archivos_FECHA.tar.gz -C /var/www/agrosys/uploads
```

### Seguridad de producción

- Cambie las credenciales demo y mantenga `.env` fuera del repositorio.
- Use dos secretos JWT distintos y rote los secretos comprometidos.
- No exponga los puertos `4000`, `5432` ni Adminer a Internet.
- Mantenga Ubuntu, Node.js, PostgreSQL y dependencias actualizados.
- Automatice copias y pruebe restauraciones periódicamente.
- Revise `pm2 logs agrosys-api`, logs de Nginx y espacio en disco.
- Restrinja SSH mediante claves y deshabilite el acceso remoto de `root` cuando sea viable.

### Problemas frecuentes

- **`Failed to fetch`**: compruebe `/health`, `pm2 status`, `sudo nginx -t`, HTTPS, `VITE_API_URL=/api/v1` y la consola Red del navegador.
- **CORS**: `CORS_ORIGIN` debe coincidir exactamente con el dominio y protocolo público.
- **Login sin persistencia**: en producción la cookie segura requiere HTTPS y el frontend debe enviar credenciales.
- **Migración rechazada**: verifique `DATABASE_URL`, permisos del rol y la extensión PostGIS.
- **Cambios visuales ausentes**: ejecute `npm run build`, recargue PM2 si cambió backend y vacíe la caché del navegador.
- **Error 502**: confirme que PM2 ejecuta la API en `127.0.0.1:4000` y revise sus logs.

## Próximas fases

- **Fase 2 — Parcelas:** mapas PostGIS, ciclos de cultivo, actividades de campo, monitoreo y consumos internos imputados por parcela.
- **Fase 3 — Operaciones:** asesoría y órdenes de servicio, alquiler/mantenimiento de maquinaria y gestión de personal.
- **Fase 4 — Administración:** planillas, costos agropecuarios, integración contable, PWA, trabajo sin conexión y analítica avanzada.

### Nota sobre normativa laboral

Los parámetros laborales y los feriados sembrados para 2024 y 2025 son valores históricos de referencia para demostración. Antes de liquidar salarios, aportes, RC-IVA, beneficios sociales o indemnizaciones, el cliente debe validar los porcentajes y reglas aplicables con su contador y con la normativa vigente de Bolivia. Las tasas parametrizables deben mantenerse por gestión y actualizarse cuando corresponda.

## Referencias operativas

- [Descargas de Node.js](https://nodejs.org/en/download)
- [PostgreSQL para Ubuntu](https://www.postgresql.org/download/linux/ubuntu/)
- [Documentación de PostGIS](https://postgis.net/documentation/)
- [Inicio automático de PM2](https://pm2.keymetrics.io/docs/usage/startup/)
- [Certbot](https://certbot.eff.org/instructions)

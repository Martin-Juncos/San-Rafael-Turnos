# Arquitectura Backend

## Alcance

Backend-only para San Rafael Turnos (Node.js + Express + Sequelize + PostgreSQL).

## Capas

1. `routes/`
- Define endpoints y encadena middlewares (`validate`, auth/RBAC, ownership, rate-limits).
- No contiene reglas de negocio ni acceso directo a DB.

2. `controllers/`
- Orquesta `req/res` y delega lógica al service.
- Conserva shape de respuesta y manejo de códigos HTTP.

3. `services/`
- Contiene reglas de negocio del dominio (turnos, pagos, mensajería, news).
- Ejecuta casos de uso y coordinación transaccional.

4. `repositories/`
- Encapsula consultas Sequelize frecuentes/complejas.
- Reduce acoplamiento controller/service con detalles ORM.

5. `db/`
- Modelos Sequelize y migraciones SQL versionadas.
- Sin `sync alter/force` en runtime.

## Flujo de request

1. Request entra por `app.js` con `requestId`, logging, security middlewares y limitadores.
2. Route valida input con Zod y aplica auth/RBAC.
3. Controller llama service.
4. Service usa repositorios/modelos y, si corresponde, transacciones.
5. Errores suben a `errorHandler`, que normaliza errores Sequelize y responde envelope JSON consistente.

## Seguridad baseline

- `helmet` activo global.
- CORS por variable de entorno (`CORS_ORIGIN`).
- Rate limiters separados (`global`, `auth`, `payments`, `webhook`, `messages`).
- JWT access/refresh con expiración configurable.
- Hash de passwords con bcrypt.
- Redacción de campos sensibles en logs.
- Middleware de ownership reusable para doctor/patient self access.

## Observabilidad

- Logger estructurado con pino.
- Log por request con `requestId`, `method`, `path`, `statusCode`, `durationMs`, `userRole`, `userId`.
- Hook opcional Sentry (`SENTRY_DSN`) para captura de excepciones server-side.

## Persistencia y migraciones

- Migraciones SQL `up/down` en `src/db/migrations`.
- Runner `src/db/migrationRunner.js` usa tabla `schema_migrations`.
- Índices de performance agregados por migraciones (no en runtime).

## Convenciones de validación

- Zod como única librería de validación.
- Primitivas reutilizables en `src/validators/common.js`:
  - `dniSchema`
  - `phoneSchema`
  - `isoDateSchema`
  - `hhmmSchema`
  - `hhmmWithOptionalSecondsSchema`

## Testing mínimo actual

- Smoke test de `GET /health`.
- Tests RBAC/ownership middleware.
- Test del flujo crítico de creación de turno hold + conflicto de doble booking (con dependencias mockeadas).
- Test del job de expiración de holds con advisory lock.

# Backend - San Rafael Turnos

API backend en Node.js + Express + Sequelize/PostgreSQL.

## Setup

1. Copiar `backend/.env.example` a `backend/.env`.
2. Completar secretos y `DATABASE_URL`.
3. Para integracion, definir `DATABASE_URL_TEST` apuntando a una base de test.
4. Ejecutar migraciones:

```bash
npm run db:migrate
```

5. (Opcional) Cargar seed:

```bash
npm run seed
```

6. Levantar backend:

```bash
npm run dev
```

Healthcheck:
- `GET http://localhost:4000/health`

## Scripts

| Script | Descripcion |
|---|---|
| `npm run dev` | Levanta servidor con nodemon |
| `npm run start` | Levanta servidor en modo node |
| `npm run db:migrate` | Aplica migraciones SQL versionadas |
| `npm run db:status` | Lista migraciones aplicadas vs pendientes |
| `npm run db:validate` | Smoke check de esquema (tablas/columnas/FKs criticas) |
| `npm run db:rollback` | Revierte ultima migracion SQL |
| `npm run seed` | Carga datos iniciales |
| `npm run audit:db-schema` | Ejecuta auditoria de esquema DB |
| `npm run lint` | Ejecuta ESLint |
| `npm run test` | Ejecuta tests unit/smoke (`node:test`) |
| `npm run test:integration` | Ejecuta tests de integracion con Postgres real |
| `npm run build` | Check de build backend |

## CI (GitHub Actions)

El workflow `/.github/workflows/ci.yml` valida backend-only en cada `push`/`pull_request` a `main` y `master`.

Checks que ejecuta:
- `npm run lint`
- `npm test`
- `npm run build`
- `npm run db:migrate` (prepara schema en DB de test limpia)
- `npm run db:validate`
- `npm run test:integration` (con Postgres real en service container)

Garantias de seguridad en CI:
- usa DB de test aislada (`san_rafael_turnos_test`) en service `postgres:16`.
- define solo `DATABASE_URL_TEST` apuntando a esa DB de test.
- no usa secretos reales de produccion.

Repro local de CI:

```bash
npm run lint
npm test
npm run build
npm run db:migrate
npm run db:validate
npm run test:integration
```

Variables minimas para integracion:
- `DATABASE_URL_TEST` (obligatoria y debe incluir `test` en el nombre de DB)
- `JWT_ACCESS_SECRET` y `JWT_REFRESH_SECRET` (>= 16 chars)
- `FRONTEND_PUBLIC_URL`

Nota:
- en `NODE_ENV=test`, la configuracion usa `DATABASE_URL_TEST` como fuente primaria de conexion.

## Estructura backend

```text
backend/
  scripts/                # auditorias y pruebas e2e utilitarias
  src/
    config/               # env, db, logger, observability
    controllers/          # adaptadores HTTP (req/res)
    db/
      migrations/         # migraciones SQL (up/down)
      models/             # definicion Sequelize + asociaciones
    jobs/                 # jobs programados (expired holds)
    middlewares/          # auth, validacion, errores, logging, ownership
    repositories/         # encapsulacion de consultas Sequelize
    routes/               # declaracion de endpoints y middlewares
    services/             # reglas de negocio
    utils/                # helpers compartidos
    validators/           # primitivas zod reutilizables
  tests/                  # pruebas unitarias/smoke
```

## Tests de integracion (Postgres real)

El harness de integracion:
- exige `DATABASE_URL_TEST`,
- valida que el nombre de DB incluya `test`,
- crea schema unico por corrida (`test_<timestamp>_<rand>`),
- aplica baseline DDL + migraciones SQL en ese schema (sin `sequelize.sync`),
- trunca tablas entre tests,
- elimina schema al finalizar.

Ejecucion:

```bash
npm run test:integration
```

Garantia de seguridad:
- si `DATABASE_URL_TEST` no existe o no parece DB de test, la suite falla antes de ejecutar operaciones.
- toda creacion de esquema se hace via migraciones versionadas en `src/db/migrations`.

Migracion fresh en schema temporal (sin crear DB nueva):

```bash
DB_SCHEMA=test_manual npm run db:migrate
```

Estado y validacion de migraciones:

```bash
npm run db:status
npm run db:validate
```

## Baseline y ambientes existentes

Regla deterministica de baseline:
- `000_initial_schema` se considera aplicada solo si existe en `schema_migrations`.
- si no existe marca de baseline, el runner intenta aplicarla.
- si detecta tablas existentes sin marca baseline, aborta para evitar estado inconsistente.

Procedimiento en ambiente existente (solo si confirmaste manualmente que el esquema ya equivale al baseline):

```bash
DB_BASELINE_ASSUME_APPLIED=true npm run db:migrate
```

Esto inserta la marca de baseline en `schema_migrations` y continua con pendientes.

## Decisiones tecnicas

- Migraciones SQL versionadas como unico mecanismo de cambio de esquema.
- `sequelize.sync({ alter|force })` no se usa en runtime.
- Arquitectura objetivo: `routes -> controllers -> services -> repositories/db`.
- Errores DB de Sequelize se traducen centralmente a respuestas 4xx/5xx consistentes.
- Logging de request con `requestId`, `durationMs`, `status`, `userRole` y `userId`.
- Observabilidad: hooks de Sentry listos por env (`SENTRY_DSN`) sin dependencia obligatoria.
- Seguridad baseline: `helmet`, `cors` por env, rate-limits global/auth/payments/webhook.

## Notas operativas

- Job de expiracion de HOLD usa `pg_try_advisory_lock` para evitar ejecucion paralela en multi-instancia.
- `npm run audit:db-schema` genera:
  - `docs/db/schema_snapshot.json`
  - `docs/db/schema_audit.md`

## Prueba de lock single-instance (expired holds)

```bash
npm run db:migrate
npm run test:hold-lock
```

La prueba crea un `hold` vencido, levanta dos instancias (`4001` y `4002`), valida lock y limpia fixtures.

# Backend - San Rafael Turnos

Backend API en Node.js + Express + Sequelize/PostgreSQL.

## Comandos

```bash
npm run dev
npm run start
npm run db:migrate
npm run db:rollback
npm run seed
npm run audit:db-schema
npm run lint
npm run test
```

## Flujo recomendado local

1. Configurar `backend/.env` (usar `backend/.env.example` como base).
2. Ejecutar migraciones:

```bash
npm run db:migrate
```

3. (Opcional) Cargar datos de ejemplo:

```bash
npm run seed
```

4. Levantar API:

```bash
npm run dev
```

## Notas operativas

- El backend ya no ejecuta `sequelize.sync()` al iniciar.
- Los cambios de esquema se gestionan solo con migraciones SQL versionadas.
- El job de expiracion de HOLD usa `pg_try_advisory_lock` para evitar ejecucion paralela en multi-instancia.
- `npm run audit:db-schema` genera/actualiza:
  - `docs/db/schema_snapshot.json`
  - `docs/db/schema_audit.md`

## Prueba de lock single-instance (expired holds)

1. Aplicar migraciones:

```bash
npm run db:migrate
```

2. Ejecutar prueba end-to-end:

```bash
npm run test:hold-lock
```

La prueba:
- crea un appointment `hold` vencido (fixture),
- levanta 2 instancias en puertos `4001` y `4002`,
- verifica expiracion + evidencia de lock single-instance,
- y limpia el fixture al terminar (salvo que `HOLD_LOCK_TEST_KEEP_DATA=true`).

Logs de diagnostico:
- `backend/.tmp/dual-instance-A.log`
- `backend/.tmp/dual-instance-B.log`

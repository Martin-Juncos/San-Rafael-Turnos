# Backend - San Rafael Turnos

API backend en Node.js + Express + Sequelize/PostgreSQL.

## Setup

1. Completa `backend/.env`.
2. Para integracion, define `DATABASE_URL_TEST` apuntando a una base de test.
3. Ejecuta migraciones:

```bash
npm run db:migrate
```

4. (Opcional) Carga seed:

```bash
npm run seed
```

5. Levanta backend:

```bash
npm run dev
```

Healthcheck:
- `GET http://localhost:4000/health`

## Arranque diario

Para empezar a trabajar:

```bash
npm run dev
```

Si tambien vas a probar pagos reales en desarrollo, en otra terminal:

```bash
C:\ngrok\ngrok.exe http 4000
```

Antes de probar Mercado Pago:
- verifica `http://localhost:4000/health`
- verifica que `ngrok` siga apuntando a `http://localhost:4000`
- si la URL publica cambio, actualiza `MERCADOPAGO_WEBHOOK_URL` y reinicia backend

## Mercado Pago en desarrollo

Variables clave:
- `MERCADOPAGO_ACCESS_TOKEN`
- `MERCADOPAGO_WEBHOOK_URL`
- `MERCADOPAGO_WEBHOOK_SECRET` (opcional, recomendado si ya configuraste firma)
- `FRONTEND_PUBLIC_URL`

Flujo actual:
- `POST /api/payments/mercadopago/preference`: crea la preferencia desde estado confiable del turno.
- `POST /api/payments/mercadopago/webhook`: recibe notificaciones de Mercado Pago y reconcilia el pago local.
- `POST /api/payments/mercadopago/sync`: respaldo manual para cuando el frontend vuelve con `payment_id`.

Para desarrollo con `ngrok`:

```bash
ngrok http 4000
```

Luego:

```env
MERCADOPAGO_WEBHOOK_URL=https://TU-URL-NGROK/api/payments/mercadopago/webhook
```

Si defines `MERCADOPAGO_WEBHOOK_SECRET`, el backend valida `x-signature`. Si no, el webhook sigue funcionando, pero sin verificacion criptografica.

## Scripts

| Script | Descripcion |
|---|---|
| `npm run dev` | Levanta servidor con nodemon |
| `npm run start` | Levanta servidor en modo node |
| `npm run db:migrate` | Aplica migraciones SQL versionadas |
| `npm run db:status` | Lista migraciones aplicadas vs pendientes |
| `npm run db:validate` | Smoke check de esquema |
| `npm run db:rollback` | Revierte la ultima migracion SQL |
| `npm run seed` | Carga datos iniciales |
| `npm run audit:db-schema` | Ejecuta auditoria de esquema DB |
| `npm run lint` | Ejecuta ESLint |
| `npm run test` | Ejecuta tests unitarios/smoke |
| `npm run test:integration` | Ejecuta tests de integracion con Postgres real |
| `npm run build` | Check de build backend |

## Estructura backend

```text
backend/
  scripts/
  src/
    config/
    controllers/
    db/
      migrations/
      models/
    jobs/
    middlewares/
    repositories/
    routes/
    services/
    utils/
    validators/
  tests/
```

## Decisiones tecnicas

- Migraciones SQL versionadas como unico mecanismo de cambio de esquema.
- `sequelize.sync({ alter|force })` no se usa en runtime.
- Arquitectura objetivo: `routes -> controllers -> services -> repositories/db`.
- Errores DB de Sequelize se traducen centralmente a respuestas 4xx/5xx consistentes.
- Logging de request con `requestId`, `durationMs`, `status`, `userRole` y `userId`.
- Seguridad baseline: `helmet`, `cors` por env, rate-limits global/auth/payments/webhook y validacion opcional de firma para Mercado Pago.

## Observabilidad del flujo de pago

Los logs relevantes del backend usan estos eventos:
- `mercadopago-preference-created`
- `mercadopago-webhook-received`
- `mercadopago-webhook-ignored`
- `mercadopago-webhook-payment-matched`
- `mercadopago-payment-reconciled`
- `mercadopago-webhook-processed`
- `mercadopago-payment-sync-request-processed`

Esto permite diagnosticar rapido si fallo:
- la creacion de preferencia,
- la llegada del webhook,
- la validacion de firma,
- la correlacion con turno local,
- o la reconciliacion final.

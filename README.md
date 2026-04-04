# San Rafael Turnos

Sistema web de turnos online para la Clinica San Rafael Arcangel con pagos via Mercado Pago Checkout Pro, confirmacion por WhatsApp mock y paneles por rol.

## Estado actual

- Version: `0.1.0`
- Monorepo con `backend/` y `frontend/` independientes
- Backend en Express + Sequelize/PostgreSQL
- Frontend en React + Vite

## Arquitectura

```text
.
|-- backend/
|   |-- src/
|   |   |-- config/
|   |   |-- controllers/
|   |   |-- db/
|   |   |-- docs/
|   |   |-- jobs/
|   |   |-- middlewares/
|   |   |-- repositories/
|   |   |-- routes/
|   |   |-- services/
|   |   `-- utils/
|   `-- tests/
`-- frontend/
    `-- src/
        |-- api/
        |-- app/
        |-- components/
        |-- features/
        |-- pages/
        |-- services/
        `-- styles/
```

## Requisitos

- Node.js 20+
- npm 10+
- PostgreSQL 14+

## Setup local

1. Configura variables:
   - Backend: `backend/.env`
   - Frontend: `frontend/.env`

2. Instala dependencias:

```bash
cd backend
npm install
cd ../frontend
npm install
```

3. Ejecuta migracion y seed desde `backend/`:

```bash
npm run db:migrate
npm run seed
```

4. Levanta backend:

```bash
cd backend
npm run dev
```

5. Levanta frontend:

```bash
cd frontend
npm run dev
```

6. Si vas a probar Mercado Pago end-to-end en desarrollo, expone el backend con `ngrok`:

```bash
ngrok http 4000
```

7. Copia la URL publica de `ngrok` en:

```env
MERCADOPAGO_WEBHOOK_URL=https://TU-URL-NGROK/api/payments/mercadopago/webhook
```

Y reinicia el backend.

## Arranque diario

Si vas a trabajar en desarrollo general:

```bash
cd backend
npm run dev
```

```bash
cd frontend
npm run dev
```

Si ademas vas a probar Mercado Pago con webhook real:

```bash
C:\ngrok\ngrok.exe http 4000
```

Checklist rapida de inicio:
- Backend: `http://localhost:4000/health`
- Frontend: `http://localhost:5173`
- ngrok: confirmar que muestra una URL publica activa
- Si la URL de `ngrok` cambia, actualizar `MERCADOPAGO_WEBHOOK_URL` en `backend/.env` o `backend/.env.local` y reiniciar backend

## Endpoints utiles

- Frontend: `http://localhost:5173`
- Health backend local: `http://localhost:4000/health`
- Health backend publico: `https://TU-URL-NGROK/health`
- OpenAPI JSON: `http://localhost:4000/api/openapi.json`
- Swagger: `http://localhost:4000/api/docs`
- ngrok inspector: `http://127.0.0.1:4040`

## Credenciales demo

- Admin: `prof.mcjuncos@gmail.com / Cordoba2020`
- Clinica: `clinica@mail.com / clinica`
- Medico: `medico@mail.com / 30111222`
- Paciente: ingreso rapido desde pantalla de login con DNI y datos personales

## Flujo Mercado Pago en desarrollo

1. El paciente crea una reserva. El turno nace en `hold` y el pago en `pending`.
2. El backend crea la preferencia usando el monto persistido del turno.
3. El frontend renderiza el `Wallet` oficial de `@mercadopago/sdk-react`.
4. Mercado Pago devuelve al frontend y, en paralelo, notifica al backend por webhook.
5. El backend consulta el pago real en Mercado Pago, reconcilia el estado local y confirma el turno si el pago fue aprobado.
6. El frontend consulta el estado local y muestra `verificando`, `pagado`, `pendiente`, `rechazado` o `reserva vencida`.

## Verificacion manual recomendada

- Abrir `https://TU-URL-NGROK/health` y comprobar `"ok": true`.
- Crear una reserva nueva desde `http://localhost:5173`.
- Iniciar y completar el pago en Mercado Pago.
- Confirmar en `ngrok` un `POST /api/payments/mercadopago/webhook 200 OK`.
- Verificar que el turno quede `Confirmado` y el pago `Pagado` en la app.

## Scripts

### Backend

- `npm run dev`
- `npm run start`
- `npm run db:migrate`
- `npm run db:rollback`
- `npm run db:reset:operational`
- `npm run db:reset:demo`
- `npm run seed`
- `npm run lint`
- `npm run test`
- `npm run audit:db-schema`

## Reset de datos de prueba

Si hiciste muchas pruebas con reservas y pagos, ahora tienes dos caminos seguros desde `backend/`:

```bash
npm run db:reset:operational
```

Limpia solo datos operativos de prueba:
- pacientes
- turnos
- pagos y webhooks
- mensajes
- notas de consulta
- bloqueos
- tokens de sesion
- auditoria

Conserva medicos, especialidades, secretarias, obras sociales y usuarios staff.

```bash
npm run db:reset:demo
```

Hace una limpieza completa de datos operativos y catalogos, y luego vuelve a ejecutar el seed minimo.

Despues de `db:reset:demo`, te quedan de nuevo:
- Admin: `prof.mcjuncos@gmail.com / Cordoba2020`
- Clinica: `clinica@mail.com / clinica`
- Medico demo: `medico@mail.com / 30111222`
- Especialidades, medico y obra social basicos del seed

Luego puedes volver a cargar el resto desde la aplicacion:
- especialidades, medicos, secretarias y obras sociales desde el panel admin
- pacientes desde la pantalla de ingreso con DNI
- turnos desde la reserva normal

### Frontend

- `npm run dev`
- `npm run build`
- `npm run preview`
- `npm run lint`
- `npm run test`

## Deploy en Render

Este repo ya queda preparado como monorepo para Render mediante `render.yaml` en la raiz.

Recursos previstos:
- Base Postgres administrada: `san-rafael-turnos-db`
- Web Service backend con `rootDir: backend`
- Static Site frontend con `rootDir: frontend`

Regla de trabajo recomendada:
1. Conecta este repo en Render y sincroniza `render.yaml`.
2. Revisa antes de crear recursos que el backend usa plan `starter` y la base usa `basic-256mb`.
3. Completa manualmente en Render las variables marcadas como secretas o dependientes de dominio.
4. Deja que el primer deploy del backend ejecute `npm run db:migrate`.
5. Si quieres datos demo despues del primer deploy, ejecuta una vez `npm run seed` sobre el backend.

Variables que debes completar en Render despues de conocer las URLs finales:
- Backend:
  - `CORS_ORIGIN=https://TU-FRONTEND.onrender.com`
  - `FRONTEND_PUBLIC_URL=https://TU-FRONTEND.onrender.com`
  - `MERCADOPAGO_WEBHOOK_URL=https://TU-BACKEND.onrender.com/api/payments/mercadopago/webhook`
  - `MERCADOPAGO_ACCESS_TOKEN`
  - `MERCADOPAGO_WEBHOOK_SECRET` si activas firma
- Frontend:
  - `VITE_API_URL=https://TU-BACKEND.onrender.com/api`
  - `VITE_MERCADOPAGO_PUBLIC_KEY`

Notas de deploy:
- El frontend usa `BrowserRouter`, por eso el blueprint incluye rewrite de SPA hacia `/index.html`.
- El backend corre un job interno de expiracion de holds; por eso el blueprint deja el backend como Web Service siempre activo y no como funcion serverless.
- Render ignora cambios fuera del `rootDir` de cada servicio para autodeploys, asi que `docs/`, `.vscode/`, `.codex/` y otros archivos de soporte no bloquean este esquema.

## Seguridad

- JWT access token de 15m.
- Refresh token con rotacion y revocacion.
- Rate limit global y para rutas sensibles.
- Validacion de input con Zod.
- Guardrails anti doble booking por transaccion + indice unico parcial.
- Webhook de Mercado Pago con validacion opcional de firma `x-signature`.

## Limites actuales

- WhatsApp real no integrado, solo mock.
- Produccion base preparada para Render, pero faltan completar secretos, dominios y claves reales de terceros.
- En desarrollo, el webhook requiere `ngrok` o una URL publica equivalente.

Hecho por el Prof. Mercho con mucho 💖 y ☕

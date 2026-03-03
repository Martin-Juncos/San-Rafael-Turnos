# San Rafael Turnos

Sistema web de turnos online para la Clinica San Rafael Arcangel con pagos mock, confirmacion por WhatsApp mock y paneles por rol.

## Estado

- Version: `0.1.0` (MVP)
- Fecha: `2026-02-24`
- Estructura: `frontend/` y `backend/` independientes

## Modo de trabajo

El repositorio ahora esta configurado como dos proyectos independientes:

- `backend/`: tiene su propio `package.json`, `package-lock.json` y `node_modules`.
- `frontend/`: tiene su propio `package.json`, `package-lock.json` y `node_modules`.

## Arquitectura

```text
.
|-- backend/
|   |-- src/
|   |   |-- config/
|   |   |-- controllers/
|   |   |-- db/
|   |   |-- docs/
|   |   |-- middlewares/
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

2. Instala dependencias por proyecto:

```bash
cd backend
npm install
cd ../frontend
npm install
```

3. Ejecuta migracion y seed (desde `backend/`):

```bash
npm run db:migrate
npm run seed
```

4. Levanta backend (terminal 1, en `backend/`):

```bash
npm run dev
```

5. Levanta frontend (terminal 2, en `frontend/`):

```bash
npm run dev
```

## Endpoints utiles

- Frontend: `http://localhost:5173`
- Health backend: `http://localhost:4000/health`
- OpenAPI JSON: `http://localhost:4000/api/openapi.json`
- Swagger: `http://localhost:4000/api/docs`

## Credenciales demo

- Admin: `admin@mail.com / admin`
- Clinica: `clinica@mail.com / clinica`
- Medico: `medico@mail.com / medico`
- Paciente: OTP desde pantalla de login (en desarrollo se informa `debugCode`)

## Scripts

### Backend (`backend/`)

- `npm run dev`
- `npm run start`
- `npm run migrate`
- `npm run db:migrate`
- `npm run db:rollback`
- `npm run seed`
- `npm run lint`
- `npm run test`
- `npm run audit:db-schema`

### Frontend (`frontend/`)

- `npm run dev`
- `npm run build`
- `npm run preview`
- `npm run lint`
- `npm run test`

## Seguridad MVP

- JWT access token 15m.
- Refresh token con rotacion y revocacion.
- OTP hasheado.
- Rate limit global y para rutas sensibles.
- Validacion de input con Zod.
- Guardrails anti doble booking por transaccion + indice unico parcial.

## Limites actuales (MVP)

- WhatsApp real no integrado (mock).
- Pasarela real no integrada (mock).

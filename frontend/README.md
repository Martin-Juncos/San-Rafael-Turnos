# Frontend - San Rafael Turnos

Aplicacion React (Vite) para el portal de turnos y paneles por rol.

## Estructura de carpetas

```text
src/
  app/
  api/
  components/
  data/
  features/
  hooks/
  pages/
  services/api/
  styles/
```

## Variables de entorno

`VITE_API_URL`:
URL base del backend (`http://localhost:4000/api` por defecto).

`VITE_API_WITH_CREDENTIALS`:
`true|false`. Activa `withCredentials` para flujos con cookies.

`VITE_API_TIMEOUT_MS`:
Timeout global HTTP en milisegundos (por defecto `12000`).

`VITE_API_RETRY_COUNT`:
Reintentos automaticos para requests idempotentes (`GET/HEAD/OPTIONS`, por defecto `1`).

`VITE_MERCADOPAGO_PUBLIC_KEY`:
Clave publica usada por `@mercadopago/sdk-react` para renderizar el `Wallet`.

## Comandos

`npm run dev`:
levanta Vite en desarrollo.

`npm run lint`:
ejecuta ESLint sobre `src/**/*.{js,jsx}`.

`npm run test`:
ejecuta tests con Vitest (`run`).

`npm run build`:
genera build de produccion.

## Decisiones clave

- Cliente API centralizado en `src/services/api/client.js` para unificar `baseURL`, timeout, retry y errores.
- Persistencia de auth en cliente con `features/auth/sessionManager.js`.
- Guardas de ruta separadas:
  - `ProtectedRoute`
  - `RoleRoute`
- Rutas con lazy loading (`src/app/routes.jsx`).
- La reserva del paciente usa un flujo de pago simple:
  - crea reserva en `hold`
  - pide preferencia al backend
  - renderiza `Wallet` de Mercado Pago
  - al volver, consulta el estado local del turno/pago
  - deja el webhook como fuente principal de verdad

## Mercado Pago en desarrollo

- Frontend local: `http://localhost:5173`
- Backend local: `http://localhost:4000`
- Si pruebas webhook real, el backend debe estar expuesto por `ngrok`.
- El frontend no necesita URL publica para operar normalmente, pero el backend si la necesita para que Mercado Pago pueda notificar el webhook. Atencion!

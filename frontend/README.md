# Frontend - San Rafael Turnos

Aplicacion React (Vite) para el portal de turnos y paneles por rol.

## Estructura de carpetas

```text
src/
  app/                  # store Redux y rutas de aplicacion
  api/                  # wrappers de compatibilidad (legacy imports)
  components/           # componentes de layout/public/ui
  data/                 # datos estaticos
  features/             # slices de Redux y manejo de sesion
  hooks/                # hooks reutilizables
  pages/                # pantallas por dominio/rol
  services/api/         # cliente HTTP central + servicios por recurso
  styles/               # estilos globales
```

## Variables de entorno

`VITE_API_URL`:
URL base del backend (`http://localhost:4000/api` por defecto).

`VITE_API_WITH_CREDENTIALS`:
`true|false`. Activa `withCredentials` para flujos con cookies.

`VITE_API_TIMEOUT_MS`:
timeout global HTTP en milisegundos (por defecto `12000`).

`VITE_API_RETRY_COUNT`:
reintentos automáticos para requests idempotentes (`GET/HEAD/OPTIONS`, por defecto `1`).

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

- Cliente API centralizado en `src/services/api/client.js` para unificar:
  - `baseURL` por entorno
  - timeout y retry controlado
  - manejo estandar de errores (`ApiError`)
  - recuperacion de `401` (refresh/relogin paciente) y limpieza de sesion
- Persistencia de auth en cliente con helper unico (`features/auth/sessionManager.js`), evitando duplicar la gestion de token en varios módulos.
- Guardas de ruta separadas:
  - `ProtectedRoute`: exige sesion autenticada
  - `RoleRoute`: valida roles permitidos y deriva a `/no-autorizado`
- Rutas con lazy loading (`src/app/routes.jsx`) para reducir payload inicial sin cambiar paths existentes.


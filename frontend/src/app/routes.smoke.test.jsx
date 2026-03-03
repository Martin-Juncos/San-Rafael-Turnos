/* @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router-dom'
import App from '../App'
import { createAppStore } from './store'

const renderApp = ({ path = '/', preloadedState } = {}) => {
  const store = createAppStore(preloadedState)
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </Provider>
  )
}

const unauthenticatedState = {
  auth: {
    token: null,
    refreshToken: null,
    user: null,
    patient: null,
    role: null,
    status: 'idle',
    error: null
  }
}

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  cleanup()
})

describe('App routing smoke', () => {
  it('renders public landing route', async () => {
    renderApp({ path: '/', preloadedState: unauthenticatedState })
    expect(await screen.findByText(/San Rafael Turnos/i)).toBeInTheDocument()
  })

  it('redirects unauthenticated users from private routes to login', async () => {
    renderApp({ path: '/dashboard/admin', preloadedState: unauthenticatedState })
    expect(await screen.findByRole('heading', { name: /Ingresar/i })).toBeInTheDocument()
  })

  it('shows unauthorized screen on role mismatch', async () => {
    renderApp({
      path: '/dashboard/admin',
      preloadedState: {
        auth: {
          token: 'fake.token.value',
          refreshToken: null,
          user: null,
          patient: {
            fullName: 'Paciente Test',
            dni: '11111111',
            phone: '11111111'
          },
          role: 'patient',
          status: 'authenticated',
          error: null
        }
      }
    })

    expect(await screen.findByRole('heading', { name: /Acceso no autorizado/i })).toBeInTheDocument()
  })
})


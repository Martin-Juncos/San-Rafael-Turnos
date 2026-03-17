import axios from 'axios'
import {
  clearStoredAuthState,
  getStoredAccessToken,
  loadStoredAuthState,
  updateStoredAuthState
} from '../../features/auth/sessionManager'
import { ApiError, isRetryableApiError, toApiError } from './error'

const baseURL = (import.meta.env.VITE_API_URL || 'http://localhost:4000/api').replace(/\/+$/, '')
const timeout = Number(import.meta.env.VITE_API_TIMEOUT_MS || 12000)
const maxRetries = Number(import.meta.env.VITE_API_RETRY_COUNT || 1)
const withCredentials = ['true', '1', 'yes'].includes(
  String(import.meta.env.VITE_API_WITH_CREDENTIALS || '').toLowerCase()
)

const isAuthEndpoint = (url = '') =>
  url.includes('/auth/login') ||
  url.includes('/auth/refresh') ||
  url.includes('/patient/auth/login')

const canReloginPatient = (stored) => {
  const patient = stored?.patient
  return Boolean(
    stored?.role === 'patient' &&
    patient?.fullName &&
    patient?.dni &&
    patient?.phone
  )
}

const sleep = (ms) => new Promise((resolve) => {
  window.setTimeout(resolve, ms)
})

const retryDelayMs = (attempt) => Math.min(300 * (2 ** (attempt - 1)), 2000)

const redirectToLogin = () => {
  if (typeof window === 'undefined') return
  if (window.location.pathname === '/ingresar') return
  window.location.assign('/ingresar')
}

export const httpClient = axios.create({
  baseURL,
  timeout,
  withCredentials,
  headers: {
    Accept: 'application/json'
  }
})

const refreshClient = axios.create({
  baseURL,
  timeout,
  withCredentials,
  headers: {
    Accept: 'application/json'
  }
})

let refreshPromise = null
let patientReloginPromise = null

const updateAuthWithRefresh = ({ accessToken, refreshToken, user }) => {
  updateStoredAuthState((stored) => {
    if (!stored) return null
    return {
      ...stored,
      token: accessToken,
      refreshToken: refreshToken ?? stored.refreshToken,
      user: user ?? stored.user,
      role: user?.role ?? stored.role
    }
  })
}

const updateAuthWithPatientLogin = ({ token, patient }) => {
  updateStoredAuthState((stored) => {
    if (!stored) return null
    return {
      ...stored,
      token,
      refreshToken: null,
      user: null,
      role: 'patient',
      patient: patient ?? stored.patient
    }
  })
}

const recoverUnauthorizedRequest = async (error) => {
  const status = error?.response?.status
  const originalRequest = error?.config ?? {}
  if (status !== 401 || originalRequest._retryAuth || isAuthEndpoint(originalRequest.url)) {
    return null
  }

  const stored = loadStoredAuthState()
  if (!stored) {
    clearStoredAuthState()
    redirectToLogin()
    return null
  }

  originalRequest._retryAuth = true

  if (stored.refreshToken) {
    try {
      refreshPromise ??= refreshClient
        .post('/auth/refresh', { refreshToken: stored.refreshToken })
        .then((response) => {
          if (!response?.data?.ok) {
            throw new Error('invalid_refresh_response')
          }
          return response.data.data
        })
        .finally(() => {
          refreshPromise = null
        })

      const refreshed = await refreshPromise
      updateAuthWithRefresh(refreshed)
      originalRequest.headers = originalRequest.headers ?? {}
      originalRequest.headers.Authorization = `Bearer ${refreshed.accessToken}`
      return httpClient(originalRequest)
    } catch (_refreshError) {
      clearStoredAuthState()
      redirectToLogin()
      return null
    }
  }

  if (canReloginPatient(stored)) {
    try {
      patientReloginPromise ??= refreshClient
        .post('/patient/auth/login', {
          fullName: stored.patient.fullName,
          dni: stored.patient.dni,
          phone: stored.patient.phone,
          streetAndNumber: stored.patient.streetAndNumber || undefined,
          city: stored.patient.city || undefined
        })
        .then((response) => {
          if (!response?.data?.ok) {
            throw new Error('invalid_patient_relogin_response')
          }
          return response.data.data
        })
        .finally(() => {
          patientReloginPromise = null
        })

      const relogged = await patientReloginPromise
      updateAuthWithPatientLogin(relogged)
      originalRequest.headers = originalRequest.headers ?? {}
      originalRequest.headers.Authorization = `Bearer ${relogged.token}`
      return httpClient(originalRequest)
    } catch (_patientReloginError) {
      clearStoredAuthState()
      redirectToLogin()
      return null
    }
  }

  clearStoredAuthState()
  redirectToLogin()
  return null
}

const shouldRetryRequest = (error) => {
  const request = error?.config
  if (!request) return false
  if (maxRetries <= 0) return false
  if (isAuthEndpoint(request.url)) return false

  const method = String(request.method || 'get').toLowerCase()
  if (!['get', 'head', 'options'].includes(method)) return false

  const retryCount = Number(request._retryCount || 0)
  if (retryCount >= maxRetries) return false

  return isRetryableApiError(error)
}

const retryFailedRequest = async (error) => {
  if (!shouldRetryRequest(error)) return null

  const request = error.config
  request._retryCount = Number(request._retryCount || 0) + 1
  await sleep(retryDelayMs(request._retryCount))
  return httpClient(request)
}

httpClient.interceptors.request.use((request) => {
  const token = getStoredAccessToken()
  if (token) {
    request.headers.Authorization = `Bearer ${token}`
  }
  return request
})

httpClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const recovered = await recoverUnauthorizedRequest(error)
    if (recovered) {
      return recovered
    }

    const retried = await retryFailedRequest(error)
    if (retried) {
      return retried
    }

    return Promise.reject(toApiError(error))
  }
)

export const unwrapData = (response) => {
  if (response?.data?.ok) {
    return response.data.data
  }
  if (response?.data?.data !== undefined) {
    return response.data.data
  }
  if (response?.data !== undefined) {
    return response.data
  }
  throw new ApiError('Respuesta inesperada', 500, 'invalid_response')
}

export const unwrapCollection = (response) => {
  const payload = response?.data
  const data = payload?.ok ? payload.data : (payload?.data ?? payload)
  const items = Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : [])
  const pagination = payload?.pagination || data?.pagination || null
  return { items, pagination }
}

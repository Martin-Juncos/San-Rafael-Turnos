import axios from 'axios'
import { ApiError, toApiError } from './apiError'

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'
const AUTH_STATE_KEY = 'srt_auth_state'
const TOKEN_KEY = 'srt_access_token'

export const httpClient = axios.create({
  baseURL,
  timeout: 12000
})

httpClient.interceptors.request.use((request) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    request.headers.Authorization = `Bearer ${token}`
  }
  return request
})

const refreshClient = axios.create({
  baseURL,
  timeout: 12000
})

let refreshPromise = null
let patientReloginPromise = null

const loadAuthState = () => {
  try {
    const raw = localStorage.getItem(AUTH_STATE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch (_error) {
    return null
  }
}

const saveAuthState = (state) => {
  localStorage.setItem(AUTH_STATE_KEY, JSON.stringify(state))
  if (state?.token) {
    localStorage.setItem(TOKEN_KEY, state.token)
  } else {
    localStorage.removeItem(TOKEN_KEY)
  }
}

const clearAuthState = () => {
  localStorage.removeItem(AUTH_STATE_KEY)
  localStorage.removeItem(TOKEN_KEY)
}

const updateAuthWithRefresh = ({ accessToken, refreshToken, user }) => {
  const stored = loadAuthState()
  if (!stored) return
  const nextState = {
    ...stored,
    token: accessToken,
    refreshToken: refreshToken ?? stored.refreshToken,
    user: user ?? stored.user,
    role: user?.role ?? stored.role
  }
  saveAuthState(nextState)
}

const updateAuthWithPatientLogin = ({ token, patient }) => {
  const stored = loadAuthState()
  if (!stored) return
  const nextState = {
    ...stored,
    token,
    refreshToken: null,
    user: null,
    role: 'patient',
    patient: patient ?? stored.patient
  }
  saveAuthState(nextState)
}

const isAuthEndpoint = (url = '') =>
  url.includes('/auth/login') ||
  url.includes('/auth/refresh') ||
  url.includes('/patient/auth/login')

const redirectToLogin = () => {
  if (typeof window !== 'undefined') {
    window.location.assign('/ingresar')
  }
}

httpClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status
    const originalRequest = error?.config ?? {}

    if (status === 401 && !originalRequest._retry && !isAuthEndpoint(originalRequest.url)) {
      const stored = loadAuthState()
      const refreshToken = stored?.refreshToken

      if (refreshToken) {
        originalRequest._retry = true
        try {
          refreshPromise ??= refreshClient
            .post('/auth/refresh', { refreshToken })
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
          clearAuthState()
          redirectToLogin()
        }
      } else if (stored?.role === 'patient' && stored?.patient?.fullName && stored?.patient?.dni && stored?.patient?.phone) {
        originalRequest._retry = true
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
          clearAuthState()
          redirectToLogin()
        }
      } else {
        clearAuthState()
        redirectToLogin()
      }
    }

    return Promise.reject(toApiError(error))
  }
)

export const unwrapData = (response) => {
  if (response?.data?.ok) {
    return response.data.data
  }
  if (response?.data) {
    return response.data
  }
  throw new ApiError('Respuesta inesperada', 500, 'invalid_response')
}

const AUTH_STATE_KEY = 'srt_auth_state'
const LEGACY_TOKEN_KEY = 'srt_access_token'
const TOKEN_EXPIRY_SKEW_SECONDS = 30

const canUseStorage = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'

const decodeJwtPayload = (token) => {
  if (!token || typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length < 2) return null

  try {
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const normalized = payload.padEnd(Math.ceil(payload.length / 4) * 4, '=')
    const json = atob(normalized)
    return JSON.parse(json)
  } catch (_error) {
    return null
  }
}

export const isTokenExpired = (token, skewSeconds = TOKEN_EXPIRY_SKEW_SECONDS) => {
  const payload = decodeJwtPayload(token)
  if (!payload?.exp) return false
  const nowSeconds = Math.floor(Date.now() / 1000)
  return (payload.exp - skewSeconds) <= nowSeconds
}

const parseStoredState = (raw) => {
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch (_error) {
    return null
  }
}

const normalizeStoredState = (state) => {
  if (!state || typeof state !== 'object') return null

  const normalized = {
    token: state.token || null,
    refreshToken: state.refreshToken || null,
    user: state.user || null,
    patient: state.patient || null,
    role: state.role || null
  }

  return normalized.token ? normalized : null
}

export const loadStoredAuthState = () => {
  if (!canUseStorage()) return null

  const state = normalizeStoredState(parseStoredState(window.localStorage.getItem(AUTH_STATE_KEY)))
  if (state?.token) {
    if (isTokenExpired(state.token)) {
      clearStoredAuthState()
      return null
    }
    return state
  }

  const legacyToken = window.localStorage.getItem(LEGACY_TOKEN_KEY)
  if (!legacyToken || isTokenExpired(legacyToken)) {
    clearStoredAuthState()
    return null
  }

  return {
    token: legacyToken,
    refreshToken: null,
    user: null,
    patient: null,
    role: null
  }
}

export const getStoredAccessToken = () => loadStoredAuthState()?.token || null

export const saveStoredAuthState = (state) => {
  if (!canUseStorage()) return

  const normalized = normalizeStoredState(state)
  if (!normalized) {
    clearStoredAuthState()
    return
  }

  window.localStorage.setItem(AUTH_STATE_KEY, JSON.stringify(normalized))
  window.localStorage.removeItem(LEGACY_TOKEN_KEY)
}

export const updateStoredAuthState = (updater) => {
  if (typeof updater !== 'function') return null
  const next = updater(loadStoredAuthState())
  saveStoredAuthState(next)
  return next
}

export const clearStoredAuthState = () => {
  if (!canUseStorage()) return
  window.localStorage.removeItem(AUTH_STATE_KEY)
  window.localStorage.removeItem(LEGACY_TOKEN_KEY)
}


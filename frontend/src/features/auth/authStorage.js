const KEY = 'srt_auth_state'
const TOKEN_KEY = 'srt_access_token'

export const loadAuthState = () => {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : null
  } catch (_error) {
    return null
  }
}

export const saveAuthState = (state) => {
  localStorage.setItem(KEY, JSON.stringify(state))
  if (state?.token) {
    localStorage.setItem(TOKEN_KEY, state.token)
  } else {
    localStorage.removeItem(TOKEN_KEY)
  }
}

export const clearAuthState = () => {
  localStorage.removeItem(KEY)
  localStorage.removeItem(TOKEN_KEY)
}

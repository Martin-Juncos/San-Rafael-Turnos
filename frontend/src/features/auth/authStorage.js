import {
  clearStoredAuthState,
  loadStoredAuthState,
  saveStoredAuthState
} from './sessionManager'

export const loadAuthState = () => loadStoredAuthState()

export const saveAuthState = (state) => {
  saveStoredAuthState(state)
}

export const clearAuthState = () => {
  clearStoredAuthState()
}

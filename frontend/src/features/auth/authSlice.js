import { createSlice } from '@reduxjs/toolkit'
import { clearAuthState, loadAuthState, saveAuthState } from './authStorage'

const stored = loadAuthState()

const initialState = {
  token: stored?.token ?? null,
  refreshToken: stored?.refreshToken ?? null,
  user: stored?.user ?? null,
  patient: stored?.patient ?? null,
  role: stored?.role ?? null,
  status: 'idle',
  error: null
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setLoading: (state) => {
      state.status = 'loading'
      state.error = null
    },
    setError: (state, action) => {
      state.status = 'error'
      state.error = action.payload
    },
    setStaffSession: (state, action) => {
      const { accessToken, refreshToken, user } = action.payload
      state.status = 'authenticated'
      state.error = null
      state.token = accessToken
      state.refreshToken = refreshToken
      state.user = user
      state.patient = null
      state.role = user.role
      saveAuthState({
        token: state.token,
        refreshToken: state.refreshToken,
        user: state.user,
        patient: state.patient,
        role: state.role
      })
    },
    setPatientSession: (state, action) => {
      const { token, patient } = action.payload
      state.status = 'authenticated'
      state.error = null
      state.token = token
      state.refreshToken = null
      state.user = null
      state.patient = patient
      state.role = 'patient'
      saveAuthState({
        token: state.token,
        refreshToken: null,
        user: null,
        patient: state.patient,
        role: state.role
      })
    },
    clearSession: (state) => {
      state.status = 'idle'
      state.error = null
      state.token = null
      state.refreshToken = null
      state.user = null
      state.patient = null
      state.role = null
      clearAuthState()
    }
  }
})

export const { setLoading, setError, setStaffSession, setPatientSession, clearSession } = authSlice.actions

export const authReducer = authSlice.reducer

export const selectAuth = (state) => state.auth
export const selectRole = (state) => state.auth.role
export const selectIsAuthenticated = (state) => Boolean(state.auth.token)

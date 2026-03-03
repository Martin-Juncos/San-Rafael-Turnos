import { configureStore } from '@reduxjs/toolkit'
import { authReducer } from '../features/auth/authSlice'
import { specialtiesReducer } from '../features/specialties/specialtiesSlice'
import { doctorsReducer } from '../features/doctors/doctorsSlice'
import { appointmentsReducer } from '../features/appointments/appointmentsSlice'

const reducer = {
  auth: authReducer,
  specialties: specialtiesReducer,
  doctors: doctorsReducer,
  appointments: appointmentsReducer
}

export const createAppStore = (preloadedState) => configureStore({
  reducer,
  preloadedState
})

export const store = createAppStore()

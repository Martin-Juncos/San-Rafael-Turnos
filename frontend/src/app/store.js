import { configureStore } from '@reduxjs/toolkit'
import { authReducer } from '../features/auth/authSlice'
import { specialtiesReducer } from '../features/specialties/specialtiesSlice'
import { doctorsReducer } from '../features/doctors/doctorsSlice'
import { appointmentsReducer } from '../features/appointments/appointmentsSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    specialties: specialtiesReducer,
    doctors: doctorsReducer,
    appointments: appointmentsReducer
  }
})

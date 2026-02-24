import { createSlice } from '@reduxjs/toolkit'

const appointmentsSlice = createSlice({
  name: 'appointments',
  initialState: {
    items: [],
    pagination: null,
    messagesByAppointment: {},
    status: 'idle',
    error: null
  },
  reducers: {
    setAppointmentsLoading: (state) => {
      state.status = 'loading'
      state.error = null
    },
    setAppointmentsError: (state, action) => {
      state.status = 'error'
      state.error = action.payload
    },
    setAppointmentsData: (state, action) => {
      state.status = 'ready'
      state.error = null
      state.items = action.payload.items
      state.pagination = action.payload.pagination
    },
    setAppointmentMessages: (state, action) => {
      const { appointmentId, messages } = action.payload
      state.messagesByAppointment[appointmentId] = messages
    }
  }
})

export const {
  setAppointmentsLoading,
  setAppointmentsError,
  setAppointmentsData,
  setAppointmentMessages
} = appointmentsSlice.actions
export const appointmentsReducer = appointmentsSlice.reducer
export const selectAppointments = (state) => state.appointments

import { createSlice } from '@reduxjs/toolkit'

const doctorsSlice = createSlice({
  name: 'doctors',
  initialState: {
    items: [],
    pagination: null,
    status: 'idle',
    error: null
  },
  reducers: {
    setDoctorsLoading: (state) => {
      state.status = 'loading'
      state.error = null
    },
    setDoctorsError: (state, action) => {
      state.status = 'error'
      state.error = action.payload
    },
    setDoctorsData: (state, action) => {
      state.status = 'ready'
      state.error = null
      state.items = action.payload.items
      state.pagination = action.payload.pagination
    }
  }
})

export const { setDoctorsLoading, setDoctorsError, setDoctorsData } = doctorsSlice.actions
export const doctorsReducer = doctorsSlice.reducer
export const selectDoctors = (state) => state.doctors

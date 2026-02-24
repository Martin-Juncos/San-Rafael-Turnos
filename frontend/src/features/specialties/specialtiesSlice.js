import { createSlice } from '@reduxjs/toolkit'

const specialtiesSlice = createSlice({
  name: 'specialties',
  initialState: {
    items: [],
    pagination: null,
    status: 'idle',
    error: null
  },
  reducers: {
    setSpecialtiesLoading: (state) => {
      state.status = 'loading'
      state.error = null
    },
    setSpecialtiesError: (state, action) => {
      state.status = 'error'
      state.error = action.payload
    },
    setSpecialtiesData: (state, action) => {
      state.status = 'ready'
      state.error = null
      state.items = action.payload.items
      state.pagination = action.payload.pagination
    }
  }
})

export const { setSpecialtiesLoading, setSpecialtiesError, setSpecialtiesData } = specialtiesSlice.actions
export const specialtiesReducer = specialtiesSlice.reducer
export const selectSpecialties = (state) => state.specialties

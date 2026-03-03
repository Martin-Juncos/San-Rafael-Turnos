/* @vitest-environment jsdom */

import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useClinicFilters } from './useClinicFilters'

describe('useClinicFilters', () => {
  it('resets doctor filters to initial defaults', () => {
    const { result } = renderHook(() => useClinicFilters())
    const initialDate = result.current.today

    act(() => {
      result.current.setDoctorFilters({
        specialtyId: 'spec-1',
        search: 'Medico',
        date: '2026-01-15'
      })
    })

    act(() => {
      result.current.resetDoctorFilters()
    })

    expect(result.current.doctorFilters).toEqual({
      specialtyId: '',
      search: '',
      date: initialDate
    })
  })

  it('resets appointment filters to initial defaults', () => {
    const { result } = renderHook(() => useClinicFilters())
    const initialDate = result.current.today

    act(() => {
      result.current.setAppointmentFilters({
        doctorId: 'doc-1',
        status: 'confirmed',
        dateFrom: '2026-02-10',
        dateTo: '2026-02-25'
      })
    })

    act(() => {
      result.current.resetAppointmentFilters()
    })

    expect(result.current.appointmentFilters).toEqual({
      doctorId: '',
      status: '',
      dateFrom: initialDate,
      dateTo: ''
    })
  })
})


/* @vitest-environment jsdom */

import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useDoctorFilters } from './useDoctorFilters'

describe('useDoctorFilters', () => {
  it('syncs management form from selected appointment', () => {
    const { result } = renderHook(() => useDoctorFilters())

    act(() => {
      result.current.syncManagementForm({
        date: '2026-03-03',
        startTime: '09:30:00',
        status: 'confirmed',
        payment: { status: 'paid' },
        doctorNotes: 'Control anual'
      })
    })

    expect(result.current.managementForm).toEqual({
      date: '2026-03-03',
      startTime: '09:30',
      status: 'confirmed',
      paymentStatus: 'paid',
      doctorNotes: 'Control anual'
    })
  })

  it('resets management form to empty defaults', () => {
    const { result } = renderHook(() => useDoctorFilters())

    act(() => {
      result.current.syncManagementForm({
        date: '2026-03-03',
        startTime: '09:30:00',
        status: 'confirmed',
        payment: { status: 'paid' },
        doctorNotes: 'Nota'
      })
    })

    act(() => {
      result.current.resetManagementForm()
    })

    expect(result.current.managementForm).toEqual({
      date: '',
      startTime: '',
      status: '',
      paymentStatus: '',
      doctorNotes: ''
    })
  })
})

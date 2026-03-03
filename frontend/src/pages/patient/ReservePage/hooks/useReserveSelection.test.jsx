/* @vitest-environment jsdom */

import { act, renderHook } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { useReserveSelection } from './useReserveSelection'

const baseForm = {
  specialtyId: '',
  doctorId: '',
  insuranceId: '',
  date: '2026-03-01',
  startTime: ''
}

describe('useReserveSelection', () => {
  it('applies prefill params from location search', () => {
    const clearAvailability = vi.fn()
    const { result } = renderHook(() => {
      const [form, setForm] = useState(baseForm)
      const selection = useReserveSelection({
        doctors: [],
        form,
        setForm,
        locationSearch: '?doctorId=doc-1&specialtyId=spec-2',
        clearAvailability
      })

      return {
        ...selection,
        form
      }
    })

    expect(result.current.form.doctorId).toBe('doc-1')
    expect(result.current.form.specialtyId).toBe('spec-2')
    expect(result.current.form.startTime).toBe('')
  })

  it('resets doctor and slot when specialty changes', () => {
    const clearAvailability = vi.fn()
    const { result } = renderHook(() => {
      const [form, setForm] = useState({
        ...baseForm,
        specialtyId: 'spec-1',
        doctorId: 'doc-1',
        startTime: '09:00'
      })

      const selection = useReserveSelection({
        doctors: [],
        form,
        setForm,
        locationSearch: '',
        clearAvailability
      })

      return {
        ...selection,
        form
      }
    })

    act(() => {
      result.current.handleSpecialtyChange('spec-2')
    })

    expect(result.current.form.specialtyId).toBe('spec-2')
    expect(result.current.form.doctorId).toBe('')
    expect(result.current.form.startTime).toBe('')
    expect(clearAvailability).toHaveBeenCalledTimes(1)
  })
})

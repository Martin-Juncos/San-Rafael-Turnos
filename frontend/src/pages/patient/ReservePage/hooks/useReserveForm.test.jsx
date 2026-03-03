/* @vitest-environment jsdom */

import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useReserveForm } from './useReserveForm'

describe('useReserveForm', () => {
  it('initializes patient booking data from auth profile', () => {
    const auth = {
      patient: {
        fullName: 'Paciente Uno',
        dni: '12345678',
        phone: '2604123456',
        streetAndNumber: 'San Martin 123',
        city: 'San Rafael'
      }
    }

    const { result } = renderHook(() => useReserveForm({
      auth,
      isPatientRole: true,
      setError: vi.fn(),
      setSuccess: vi.fn(),
      setPaymentError: vi.fn()
    }))

    expect(result.current.patientLookupDone).toBe(true)
    expect(result.current.patientExists).toBe(true)
    expect(result.current.patientLookupMessage).toBe('Estas reservando con los datos de tu cuenta.')
    expect(result.current.form.fullName).toBe('Paciente Uno')
    expect(result.current.form.dni).toBe('12345678')
  })

  it('normalizes dni input and clears lookup state when editing as staff', () => {
    const { result } = renderHook(() => useReserveForm({
      auth: { patient: null },
      isPatientRole: false,
      setError: vi.fn(),
      setSuccess: vi.fn(),
      setPaymentError: vi.fn()
    }))

    act(() => {
      result.current.setForm((prev) => ({
        ...prev,
        fullName: 'Nombre',
        phone: '2604000000',
        streetAndNumber: 'Calle 1',
        city: 'Ciudad'
      }))
    })

    act(() => {
      result.current.handlePatientDniChange('12.345.678')
    })

    expect(result.current.form.dni).toBe('12345678')
    expect(result.current.form.fullName).toBe('')
    expect(result.current.form.phone).toBe('')
    expect(result.current.patientLookupDone).toBe(false)
    expect(result.current.patientExists).toBe(false)
    expect(result.current.patientLookupMessage).toBe('')
  })
})

/* @vitest-environment jsdom */

import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { removeAppointmentMock } = vi.hoisted(() => ({
  removeAppointmentMock: vi.fn()
}))

vi.mock('../../../../api/services', () => ({
  appointmentsService: {
    remove: removeAppointmentMock
  },
  paymentsService: {
    updateStatus: vi.fn()
  }
}))

import { useDoctorActions } from './useDoctorActions'

describe('useDoctorActions', () => {
  beforeEach(() => {
    removeAppointmentMock.mockReset()
  })

  it('limpia la seleccion y recarga turnos despues de eliminar definitivamente', async () => {
    const loadAppointments = vi.fn().mockResolvedValue(undefined)
    const setSelectedAppointmentId = vi.fn()
    const setError = vi.fn()
    const setMessage = vi.fn()

    removeAppointmentMock.mockResolvedValue({ id: 'appointment-1' })

    const { result } = renderHook(() => useDoctorActions({
      navigate: vi.fn(),
      activeDoctorId: 'doctor-1',
      canOpenPatientRecords: true,
      canOpenConsultRecord: true,
      doctorSpecialtyId: 'specialty-1',
      selectedPrintDate: '2026-03-27',
      appointments: [],
      selectedAppointmentId: 'appointment-1',
      setSelectedAppointmentId,
      selectedAppointment: null,
      managementForm: {
        date: '',
        startTime: '',
        status: '',
        paymentStatus: '',
        doctorNotes: ''
      },
      loadAppointments,
      setError,
      setMessage
    }))

    let deletionResult = false

    await act(async () => {
      deletionResult = await result.current.deleteAppointment('appointment-1')
    })

    expect(deletionResult).toBe(true)
    expect(removeAppointmentMock).toHaveBeenCalledWith('appointment-1')
    expect(setSelectedAppointmentId).toHaveBeenCalledWith('')
    expect(loadAppointments).toHaveBeenCalledTimes(1)
    expect(setMessage).toHaveBeenCalledWith('El turno fue eliminado definitivamente.')
    expect(setError).toHaveBeenCalledWith('')
  })
})

import { useCallback } from 'react'
import { appointmentsService, doctorsService, patientAuthService } from '../../../../api/services'
import { normalizeDni } from '../clinicDashboardUtils'

export function useClinicActions ({
  manualAppointment,
  setManualAppointment,
  manualOpenSlots,
  manualPatientLookupDone,
  setManualPatientLookupDone,
  manualPatientExists,
  setManualPatientExists,
  setManualPatientLookupMessage,
  setManualPatientLookupLoading,
  rescheduleDraft,
  rescheduleOpenSlots,
  blockDraft,
  blockStartOptions,
  blockEndOptions,
  setBlockDraft,
  setError,
  setMessage,
  loadAppointments
}) {
  const handleManualPatientDniChange = useCallback((value) => {
    const dni = normalizeDni(value)
    setManualAppointment((prev) => ({
      ...prev,
      dni,
      fullName: '',
      phone: '',
      streetAndNumber: '',
      city: ''
    }))
    setManualPatientLookupDone(false)
    setManualPatientExists(false)
    setManualPatientLookupMessage('')
  }, [setManualAppointment, setManualPatientLookupDone, setManualPatientExists, setManualPatientLookupMessage])

  const lookupManualPatientByDni = useCallback(async () => {
    setError('')
    setMessage('')
    setManualPatientLookupMessage('')

    const dni = normalizeDni(manualAppointment.dni)
    if (dni.length < 6 || dni.length > 12) {
      setError('Ingresa un DNI valido para continuar.')
      return
    }

    setManualPatientLookupLoading(true)
    try {
      const result = await patientAuthService.prefillByDni(dni)
      const exists = Boolean(result?.exists && result?.patient)
      setManualPatientLookupDone(true)
      setManualPatientExists(exists)
      setManualAppointment((prev) => ({
        ...prev,
        dni,
        fullName: exists ? (result.patient.fullName || '') : '',
        phone: exists ? (result.patient.phone || '') : '',
        streetAndNumber: exists ? (result.patient.streetAndNumber || '') : '',
        city: exists ? (result.patient.city || '') : ''
      }))
      setManualPatientLookupMessage(
        exists
          ? 'Paciente encontrado. Revisa los datos y continua con la creacion del turno.'
          : 'No encontramos ese DNI. Completa los datos para registrar al paciente.'
      )
    } catch (apiError) {
      setError(apiError.message || 'No se pudo verificar el DNI del paciente.')
      setManualPatientLookupDone(false)
      setManualPatientExists(false)
    } finally {
      setManualPatientLookupLoading(false)
    }
  }, [
    manualAppointment.dni,
    setError,
    setMessage,
    setManualPatientLookupMessage,
    setManualPatientLookupLoading,
    setManualPatientLookupDone,
    setManualPatientExists,
    setManualAppointment
  ])

  const createManualAppointment = useCallback(async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')

    const isManualTimeAvailable = manualOpenSlots.some((slot) => slot.startTime === manualAppointment.startTime)
    if (!manualAppointment.startTime || !isManualTimeAvailable) {
      setError('Selecciona un horario disponible para el medico elegido.')
      return
    }
    if (!manualPatientLookupDone) {
      setError('Primero verifica el DNI del paciente.')
      return
    }

    const normalizedDni = normalizeDni(manualAppointment.dni)
    if (normalizedDni.length < 6 || normalizedDni.length > 12) {
      setError('Ingresa un DNI valido del paciente.')
      return
    }
    if (!manualAppointment.fullName.trim() || manualAppointment.fullName.trim().length < 3) {
      setError('Completa el nombre del paciente.')
      return
    }
    if (!manualAppointment.phone.trim() || manualAppointment.phone.trim().length < 8) {
      setError('Completa un telefono valido del paciente.')
      return
    }
    if (!manualPatientExists && (!manualAppointment.streetAndNumber.trim() || manualAppointment.streetAndNumber.trim().length < 3)) {
      setError('Completa calle y numero del paciente para continuar.')
      return
    }
    if (!manualPatientExists && (!manualAppointment.city.trim() || manualAppointment.city.trim().length < 2)) {
      setError('Completa la ciudad del paciente para continuar.')
      return
    }

    try {
      const payload = {
        ...manualAppointment,
        fullName: manualAppointment.fullName.trim(),
        dni: normalizedDni,
        phone: manualAppointment.phone.trim(),
        streetAndNumber: manualAppointment.streetAndNumber.trim() || undefined,
        city: manualAppointment.city.trim() || undefined,
        symptoms: manualAppointment.symptoms.trim() || undefined
      }
      await appointmentsService.create(payload)
      setMessage(`Turno creado para ${manualAppointment.fullName} el ${manualAppointment.date} a las ${manualAppointment.startTime.slice(0, 5)}. Quedo pendiente de pago.`)
      setManualAppointment((prev) => ({
        ...prev,
        startTime: '',
        fullName: '',
        dni: '',
        phone: '',
        streetAndNumber: '',
        city: '',
        symptoms: ''
      }))
      setManualPatientLookupDone(false)
      setManualPatientExists(false)
      setManualPatientLookupMessage('')
      await loadAppointments()
    } catch (apiError) {
      setError(apiError.message)
    }
  }, [
    setError,
    setMessage,
    manualOpenSlots,
    manualAppointment,
    manualPatientLookupDone,
    manualPatientExists,
    setManualAppointment,
    setManualPatientLookupDone,
    setManualPatientExists,
    setManualPatientLookupMessage,
    loadAppointments
  ])

  const cancelAppointment = useCallback(async (appointmentId) => {
    setError('')
    setMessage('')
    try {
      await appointmentsService.cancel(appointmentId, 'cancelled_by_clinic')
      await loadAppointments()
      setMessage('Turno cancelado correctamente por la clinica.')
    } catch (apiError) {
      setError(apiError.message)
    }
  }, [setError, setMessage, loadAppointments])

  const rescheduleAppointment = useCallback(async (event) => {
    event.preventDefault()
    if (!rescheduleDraft.appointmentId) return

    const isRescheduleTimeAvailable = rescheduleOpenSlots.some((slot) => slot.startTime === rescheduleDraft.startTime)
    if (!rescheduleDraft.startTime || !isRescheduleTimeAvailable) {
      setError('Selecciona un horario disponible para reprogramar el turno.')
      return
    }
    try {
      await appointmentsService.reschedule(rescheduleDraft.appointmentId, {
        date: rescheduleDraft.date,
        startTime: rescheduleDraft.startTime
      })
      setMessage(`Turno reprogramado para el ${rescheduleDraft.date} a las ${rescheduleDraft.startTime.slice(0, 5)}.`)
      await loadAppointments()
    } catch (apiError) {
      setError(apiError.message)
    }
  }, [setError, setMessage, rescheduleDraft, rescheduleOpenSlots, loadAppointments])

  const createBlock = useCallback(async (event) => {
    event.preventDefault()
    if (!blockDraft.doctorId) return
    if (!blockDraft.startTime || !blockDraft.endTime) {
      setError('Selecciona un dia y un rango horario valido para bloquear.')
      return
    }

    const validStart = blockStartOptions.includes(blockDraft.startTime)
    const validEnd = blockEndOptions.includes(blockDraft.endTime)
    if (!validStart || !validEnd) {
      setError('El rango de bloqueo debe estar dentro del horario de atencion del medico.')
      return
    }

    try {
      await doctorsService.createBlock(blockDraft.doctorId, {
        date: blockDraft.date,
        startTime: blockDraft.startTime,
        endTime: blockDraft.endTime,
        reason: blockDraft.reason
      })
      setMessage(`Bloqueo registrado para el ${blockDraft.date} de ${blockDraft.startTime} a ${blockDraft.endTime}.`)
      setBlockDraft((prev) => ({ ...prev, startTime: '', endTime: '' }))
    } catch (apiError) {
      setError(apiError.message)
    }
  }, [setError, blockDraft, blockStartOptions, blockEndOptions, setMessage, setBlockDraft])

  return {
    handleManualPatientDniChange,
    lookupManualPatientByDni,
    createManualAppointment,
    cancelAppointment,
    rescheduleAppointment,
    createBlock
  }
}


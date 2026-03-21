import { useState } from 'react'
import { appointmentsService, paymentsService } from '../../../../api/services'
import { APPOINTMENT_STATUS_LABELS } from '../doctorDashboardUtils'

export function useDoctorActions ({
  navigate,
  activeDoctorId,
  canOpenPatientRecords,
  canOpenConsultRecord,
  doctorSpecialtyId,
  selectedPrintDate,
  appointments,
  selectedAppointmentId,
  selectedAppointment,
  managementForm,
  loadAppointments,
  setError,
  setMessage
}) {
  const [savingManagement, setSavingManagement] = useState(false)

  const updateStatus = async (appointmentId, status) => {
    setError('')
    setMessage('')
    const currentAppointment = appointments.find((item) => item.id === appointmentId)
    const label = APPOINTMENT_STATUS_LABELS[status] || status

    if (currentAppointment?.status === status) {
      setMessage(`El turno ya esta marcado como "${label}".`)
      return
    }

    try {
      await appointmentsService.update(appointmentId, { status })
      await loadAppointments()
      setMessage(`El turno fue actualizado a estado "${label}".`)
    } catch (apiError) {
      setError(apiError.message)
    }
  }

  const markPaymentAsPaid = async (appointmentId) => {
    setError('')
    setMessage('')
    const currentAppointment = appointments.find((item) => item.id === appointmentId)
    const currentStatus = currentAppointment?.payment?.status || 'pending'

    if (currentStatus === 'paid') {
      setMessage('El pago de este turno ya esta marcado como "Pagado".')
      return
    }

    try {
      await paymentsService.updateStatus(appointmentId, 'paid')
      await loadAppointments()
      setMessage('El pago del turno fue actualizado a "Pagado".')
    } catch (apiError) {
      setError(apiError.message)
    }
  }

  const saveManagement = async () => {
    if (!selectedAppointmentId || !selectedAppointment) return
    setError('')
    setMessage('')
    setSavingManagement(true)

    const appointmentPatch = {}
    const originalStartTime = (selectedAppointment.startTime || '').slice(0, 5)

    if (managementForm.date && managementForm.date !== selectedAppointment.date) {
      appointmentPatch.date = managementForm.date
    }
    if (managementForm.startTime && managementForm.startTime !== originalStartTime) {
      appointmentPatch.startTime = managementForm.startTime
    }
    if (managementForm.status && managementForm.status !== selectedAppointment.status) {
      appointmentPatch.status = managementForm.status
    }
    if (managementForm.doctorNotes !== (selectedAppointment.doctorNotes || '')) {
      appointmentPatch.doctorNotes = managementForm.doctorNotes
    }

    const currentPaymentStatus = selectedAppointment.payment?.status || 'pending'
    const paymentStatusChanged =
      managementForm.paymentStatus &&
      managementForm.paymentStatus !== currentPaymentStatus

    if (Object.keys(appointmentPatch).length === 0 && !paymentStatusChanged) {
      setMessage('No hay cambios para guardar en este turno.')
      setSavingManagement(false)
      return
    }

    try {
      if (Object.keys(appointmentPatch).length > 0) {
        await appointmentsService.update(selectedAppointmentId, appointmentPatch)
      }
      if (paymentStatusChanged) {
        await paymentsService.updateStatus(selectedAppointmentId, managementForm.paymentStatus)
      }

      await loadAppointments()
      setMessage('Los cambios del turno se guardaron correctamente.')
    } catch (apiError) {
      setError(apiError.message)
    } finally {
      setSavingManagement(false)
    }
  }

  const openPrintDayView = () => {
    if (!selectedPrintDate) return
    const url = `/dashboard/medico/imprimir?date=${encodeURIComponent(selectedPrintDate)}`
    navigate(url)
  }

  const openReserveWithPrefill = () => {
    const doctorId = activeDoctorId
    if (!doctorId) return

    const params = new URLSearchParams()
    params.set('doctorId', doctorId)
    if (doctorSpecialtyId) {
      params.set('specialtyId', doctorSpecialtyId)
    }

    navigate(`/reservar?${params.toString()}`)
  }

  const openPatientRecords = () => {
    if (!canOpenPatientRecords) return
    navigate('/dashboard/medico/registros-pacientes')
  }

  const openConsultRecord = (appointment) => {
    if (!canOpenConsultRecord) return
    if (!appointment?.id) return

    if (appointment.status === 'cancelled') {
      const statusLabel = APPOINTMENT_STATUS_LABELS[appointment.status] || appointment.status
      setError(`No se puede abrir el registro de consulta porque el turno esta en estado "${statusLabel}".`)
      return
    }

    navigate(`/dashboard/medico/consulta/${appointment.id}`)
  }

  return {
    savingManagement,
    updateStatus,
    markPaymentAsPaid,
    saveManagement,
    openPrintDayView,
    openReserveWithPrefill,
    openPatientRecords,
    openConsultRecord
  }
}

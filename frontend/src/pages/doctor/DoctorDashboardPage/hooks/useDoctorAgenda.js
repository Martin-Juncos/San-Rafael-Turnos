import { useCallback, useEffect, useMemo, useState } from 'react'
import { appointmentsService } from '../../../../api/services'

export function useDoctorAgenda ({
  selectedAppointmentId,
  setSelectedAppointmentId,
  setSelectedPrintDate,
  setError
}) {
  const [appointments, setAppointments] = useState([])

  const selectedAppointment = useMemo(
    () => appointments.find((item) => item.id === selectedAppointmentId) || null,
    [appointments, selectedAppointmentId]
  )

  const printableDates = useMemo(() => {
    const values = appointments
      .map((item) => item.date)
      .filter(Boolean)
    return Array.from(new Set(values)).sort((left, right) => left.localeCompare(right))
  }, [appointments])

  const loadAppointments = useCallback(async () => {
    const data = await appointmentsService.list({ pageSize: 50 })
    setAppointments(data.items)
  }, [])

  useEffect(() => {
    loadAppointments().catch((apiError) => setError(apiError.message))
  }, [loadAppointments, setError])

  useEffect(() => {
    setSelectedPrintDate((previous) => {
      if (previous && printableDates.includes(previous)) {
        return previous
      }
      return printableDates[0] || ''
    })
  }, [printableDates, setSelectedPrintDate])

  useEffect(() => {
    if (selectedAppointmentId && !appointments.some((item) => item.id === selectedAppointmentId)) {
      setSelectedAppointmentId('')
    }
  }, [appointments, selectedAppointmentId, setSelectedAppointmentId])

  return {
    appointments,
    selectedAppointment,
    printableDates,
    loadAppointments
  }
}

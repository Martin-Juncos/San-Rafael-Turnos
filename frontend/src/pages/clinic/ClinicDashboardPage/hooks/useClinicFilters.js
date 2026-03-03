import { useMemo, useState } from 'react'
import { toLocalIsoDate } from '../clinicDashboardUtils'

export function useClinicFilters () {
  const today = useMemo(() => toLocalIsoDate(), [])

  const [doctorFilters, setDoctorFilters] = useState({
    specialtyId: '',
    search: '',
    date: today
  })

  const [appointmentFilters, setAppointmentFilters] = useState({
    doctorId: '',
    status: '',
    dateFrom: today,
    dateTo: ''
  })

  const [manualAppointment, setManualAppointment] = useState({
    doctorId: '',
    specialtyId: '',
    date: today,
    startTime: '',
    fullName: '',
    dni: '',
    phone: '',
    streetAndNumber: '',
    city: '',
    symptoms: ''
  })

  const [rescheduleDraft, setRescheduleDraft] = useState({
    appointmentId: '',
    date: today,
    startTime: ''
  })

  const [blockDraft, setBlockDraft] = useState({
    doctorId: '',
    date: today,
    startTime: '',
    endTime: '',
    reason: 'Bloqueo administrativo'
  })

  const [rescheduleDoctorId, setRescheduleDoctorId] = useState('')

  const resetDoctorFilters = () => {
    setDoctorFilters({
      specialtyId: '',
      search: '',
      date: today
    })
  }

  const resetAppointmentFilters = () => {
    setAppointmentFilters({
      doctorId: '',
      status: '',
      dateFrom: today,
      dateTo: ''
    })
  }

  return {
    today,
    doctorFilters,
    setDoctorFilters,
    appointmentFilters,
    setAppointmentFilters,
    manualAppointment,
    setManualAppointment,
    rescheduleDraft,
    setRescheduleDraft,
    blockDraft,
    setBlockDraft,
    rescheduleDoctorId,
    setRescheduleDoctorId,
    resetDoctorFilters,
    resetAppointmentFilters
  }
}


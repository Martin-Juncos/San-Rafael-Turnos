import { useCallback, useEffect, useState } from 'react'
import { appointmentsService, doctorsService, specialtiesService } from '../../../../api/services'

export function useClinicAppointments ({ doctorFilters, appointmentFilters, setError }) {
  const [specialties, setSpecialties] = useState([])
  const [doctors, setDoctors] = useState([])
  const [appointments, setAppointments] = useState([])

  const loadBase = useCallback(async () => {
    const [specialtiesResult, doctorsResult] = await Promise.all([
      specialtiesService.list({ pageSize: 100 }),
      doctorsService.list({
        pageSize: 100,
        specialtyId: doctorFilters.specialtyId || undefined,
        search: doctorFilters.search || undefined
      })
    ])
    setSpecialties(specialtiesResult.items)
    setDoctors(doctorsResult.items)
  }, [doctorFilters.search, doctorFilters.specialtyId])

  const loadAppointments = useCallback(async () => {
    const result = await appointmentsService.list({
      pageSize: 50,
      ...appointmentFilters
    })
    setAppointments(result.items)
  }, [appointmentFilters])

  useEffect(() => {
    loadBase().catch((apiError) => setError(apiError.message))
  }, [loadBase, setError])

  useEffect(() => {
    loadAppointments().catch((apiError) => setError(apiError.message))
  }, [loadAppointments, setError])

  return {
    specialties,
    doctors,
    appointments,
    setAppointments,
    loadBase,
    loadAppointments
  }
}


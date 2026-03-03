import { useEffect, useState } from 'react'
import {
  doctorsService,
  insurancesService,
  specialtiesService
} from '../../../../api/services'

export function useReserveCatalog ({ setError }) {
  const [specialties, setSpecialties] = useState([])
  const [insurances, setInsurances] = useState([])
  const [doctors, setDoctors] = useState([])

  useEffect(() => {
    const load = async () => {
      const [specResult, insuranceResult, doctorsResult] = await Promise.all([
        specialtiesService.list({ pageSize: 100 }),
        insurancesService.list({ pageSize: 100, isActive: 'true' }),
        doctorsService.list({ pageSize: 100 })
      ])
      setSpecialties(specResult.items)
      setInsurances(insuranceResult.items)
      setDoctors(doctorsResult.items)
    }

    load().catch((apiError) => setError(apiError.message))
  }, [setError])

  return {
    specialties,
    insurances,
    doctors
  }
}

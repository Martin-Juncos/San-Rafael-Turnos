import { useEffect, useState } from 'react'
import { doctorsService } from '../api/services'

export function useDoctorSpecialty (doctorId) {
  const [specialtyId, setSpecialtyId] = useState('')

  useEffect(() => {
    if (!doctorId) {
      setSpecialtyId('')
      return
    }

    let cancelled = false

    const loadDoctorSpecialty = async () => {
      try {
        const doctor = await doctorsService.getById(doctorId)
        if (!cancelled) {
          setSpecialtyId(doctor.specialtyId || '')
        }
      } catch {
        if (!cancelled) {
          setSpecialtyId('')
        }
      }
    }

    loadDoctorSpecialty().catch(() => {})

    return () => {
      cancelled = true
    }
  }, [doctorId])

  return specialtyId
}


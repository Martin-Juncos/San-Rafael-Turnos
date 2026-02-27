import { useEffect, useMemo, useState } from 'react'
import { doctorsService } from '../api/services'
import { useAppSelector } from '../app/hooks'
import { selectAuth } from '../features/auth/authSlice'

const BASE_RESERVE_PATH = '/reservar'

const buildReservePath = ({ doctorId, specialtyId }) => {
  if (!doctorId) return BASE_RESERVE_PATH

  const params = new URLSearchParams()
  params.set('doctorId', doctorId)
  if (specialtyId) {
    params.set('specialtyId', specialtyId)
  }
  return `${BASE_RESERVE_PATH}?${params.toString()}`
}

export function useReserveLink () {
  const auth = useAppSelector(selectAuth)
  const doctorId = auth.role === 'doctor' ? auth.user?.doctorId : ''
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

  return useMemo(
    () => buildReservePath({ doctorId, specialtyId }),
    [doctorId, specialtyId]
  )
}

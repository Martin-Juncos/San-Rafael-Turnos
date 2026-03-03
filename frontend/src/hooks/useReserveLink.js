import { useMemo } from 'react'
import { useAppSelector } from '../app/hooks'
import { selectAuth } from '../features/auth/authSlice'
import { useDoctorSpecialty } from './useDoctorSpecialty'

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
  const specialtyId = useDoctorSpecialty(doctorId)

  return useMemo(
    () => buildReservePath({ doctorId, specialtyId }),
    [doctorId, specialtyId]
  )
}

import { useState } from 'react'
import { doctorsService } from '../../../../api/services'

export function useAdminDoctors () {
  const [doctors, setDoctors] = useState([])
  const [loadingDoctors, setLoadingDoctors] = useState(false)

  const loadDoctors = async () => {
    setLoadingDoctors(true)
    try {
      const result = await doctorsService.list({ pageSize: 100 })
      setDoctors(result.items)
      return result.items
    } finally {
      setLoadingDoctors(false)
    }
  }

  return {
    doctors,
    loadingDoctors,
    loadDoctors
  }
}


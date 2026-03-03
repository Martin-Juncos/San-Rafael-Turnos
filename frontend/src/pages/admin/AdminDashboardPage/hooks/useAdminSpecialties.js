import { useState } from 'react'
import { specialtiesService } from '../../../../api/services'

export function useAdminSpecialties () {
  const [specialties, setSpecialties] = useState([])
  const [loadingSpecialties, setLoadingSpecialties] = useState(false)

  const loadSpecialties = async () => {
    setLoadingSpecialties(true)
    try {
      const result = await specialtiesService.list({ pageSize: 100, isActive: 'true' })
      setSpecialties(result.items)
      return result.items
    } finally {
      setLoadingSpecialties(false)
    }
  }

  return {
    specialties,
    loadingSpecialties,
    loadSpecialties
  }
}


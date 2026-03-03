import { useState } from 'react'
import { insurancesService } from '../../../../api/services'

export function useAdminInsurances () {
  const [insurances, setInsurances] = useState([])
  const [loadingInsurances, setLoadingInsurances] = useState(false)

  const loadInsurances = async () => {
    setLoadingInsurances(true)
    try {
      const result = await insurancesService.list({ pageSize: 100 })
      setInsurances(result.items)
      return result.items
    } finally {
      setLoadingInsurances(false)
    }
  }

  return {
    insurances,
    loadingInsurances,
    loadInsurances
  }
}


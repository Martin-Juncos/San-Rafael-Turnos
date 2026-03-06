import { useCallback, useState } from 'react'
import { secretariesService } from '../../../../api/services'

export function useAdminSecretaries () {
  const [secretaries, setSecretaries] = useState([])
  const [loadingSecretaries, setLoadingSecretaries] = useState(false)

  const loadSecretaries = useCallback(async () => {
    setLoadingSecretaries(true)
    try {
      const result = await secretariesService.list({ pageSize: 100 })
      setSecretaries(result.items)
      return result.items
    } finally {
      setLoadingSecretaries(false)
    }
  }, [])

  return {
    secretaries,
    loadingSecretaries,
    loadSecretaries
  }
}

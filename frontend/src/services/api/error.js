export class ApiError extends Error {
  constructor (message, status = 500, code = 'api_error', details = null, cause = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
    this.cause = cause
  }
}

const getFallbackMessage = (error) => {
  if (error?.code === 'ECONNABORTED') {
    return 'La solicitud tardo demasiado. Intenta nuevamente.'
  }
  return 'No se pudo conectar con el servidor'
}

export const toApiError = (error) => {
  const response = error?.response
  if (!response) {
    return new ApiError(getFallbackMessage(error), 0, 'network_error', null, error)
  }

  const message = response.data?.message || 'Error de API'
  const code = response.data?.error?.code || 'api_error'
  const details = response.data?.error?.details || null
  return new ApiError(message, response.status, code, details, error)
}

export const isRetryableApiError = (error) => {
  const status = error?.response?.status
  if (!status) {
    return true
  }

  return [408, 425, 429, 500, 502, 503, 504].includes(status)
}


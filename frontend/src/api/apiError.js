export class ApiError extends Error {
  constructor (message, status = 500, code = 'api_error', details = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

export const toApiError = (error) => {
  const response = error?.response
  if (!response) {
    return new ApiError('No se pudo conectar con el servidor', 0, 'network_error')
  }

  const message = response.data?.message || 'Error de API'
  const code = response.data?.error?.code || 'api_error'
  const details = response.data?.error?.details || null
  return new ApiError(message, response.status, code, details)
}

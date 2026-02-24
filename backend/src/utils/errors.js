export class AppError extends Error {
  constructor (message, statusCode = 500, code = 'internal_error', details = null) {
    super(message)
    this.name = 'AppError'
    this.statusCode = statusCode
    this.code = code
    this.details = details
  }
}

export const isAppError = (error) => error instanceof AppError

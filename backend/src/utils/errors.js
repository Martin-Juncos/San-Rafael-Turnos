export class AppError extends Error {
  constructor (message, statusCode = 500, code = 'internal_error', details = null) {
    super(message)
    this.name = 'AppError'
    this.statusCode = statusCode
    this.code = code
    this.details = details
  }
}

export class HttpError extends AppError {
  constructor (message, statusCode = 500, code = 'http_error', details = null) {
    super(message, statusCode, code, details)
    this.name = 'HttpError'
  }
}

export const isAppError = (error) => error instanceof AppError

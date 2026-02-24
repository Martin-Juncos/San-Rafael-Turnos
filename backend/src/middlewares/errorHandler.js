import { isAppError } from '../utils/errors.js'
import { logger } from '../config/logger.js'

export const notFoundHandler = (_req, _res, next) => {
  next({ statusCode: 404, code: 'not_found', message: 'Recurso no encontrado' })
}

export const errorHandler = (error, req, res, _next) => {
  const statusCode = isAppError(error) ? error.statusCode : (error.statusCode || 500)
  const code = isAppError(error) ? error.code : (error.code || 'internal_error')
  const details = isAppError(error) ? error.details : undefined

  if (statusCode >= 500) {
    logger.error({ err: error, requestId: req.requestId }, 'request-failed')
  } else {
    logger.warn({ err: error, requestId: req.requestId }, 'request-rejected')
  }

  res.status(statusCode).json({
    ok: false,
    message: statusCode >= 500 ? 'Error interno' : error.message,
    error: {
      code,
      details
    },
    requestId: req.requestId
  })
}

import { isAppError } from '../utils/errors.js'
import { logger } from '../config/logger.js'
import { mapSequelizeError } from '../utils/sequelizeErrorMapper.js'
import { captureException } from '../config/observability.js'

export const notFoundHandler = (_req, _res, next) => {
  next({ statusCode: 404, code: 'not_found', message: 'Recurso no encontrado' })
}

export const errorHandler = (error, req, res, _next) => {
  const normalizedError = mapSequelizeError(error) || error
  const statusCode = isAppError(normalizedError) ? normalizedError.statusCode : (normalizedError.statusCode || 500)
  const code = isAppError(normalizedError) ? normalizedError.code : (normalizedError.code || 'internal_error')
  const details = isAppError(normalizedError) ? normalizedError.details : undefined

  if (statusCode >= 500) {
    logger.error({ err: normalizedError, requestId: req.requestId }, 'request-failed')
    captureException(normalizedError, {
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl || req.url,
      statusCode
    })
  } else {
    logger.warn({ err: normalizedError, requestId: req.requestId }, 'request-rejected')
  }

  res.status(statusCode).json({
    ok: false,
    message: statusCode >= 500 ? 'Error interno' : normalizedError.message,
    error: {
      code,
      details
    },
    requestId: req.requestId
  })
}

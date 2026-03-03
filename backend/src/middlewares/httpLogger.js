import pinoHttp from 'pino-http'
import { logger } from '../config/logger.js'

export const httpLogger = pinoHttp({
  logger,
  autoLogging: false
})

const getRequestPath = (req) => {
  const rawPath = req.originalUrl || req.url || req.path || ''
  return rawPath.split('?')[0]
}

export const requestLogMiddleware = (req, res, next) => {
  const startedAt = process.hrtime.bigint()

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6
    const log = req.log || logger
    const auth = req.auth || {}

    log.info(
      {
        requestId: req.requestId,
        method: req.method,
        path: getRequestPath(req),
        statusCode: res.statusCode,
        durationMs: Number(durationMs.toFixed(2)),
        userRole: auth.role || null,
        userId: auth.sub || null,
        doctorId: auth.doctorId || null,
        patientId: auth.patientId || null
      },
      'http-request'
    )
  })

  next()
}

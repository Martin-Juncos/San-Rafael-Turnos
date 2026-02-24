import pinoHttp from 'pino-http'
import { logger } from '../config/logger.js'

export const httpLogger = pinoHttp({
  logger,
  customSuccessMessage: (req, res) => `${req.method} ${req.url} -> ${res.statusCode}`,
  customErrorMessage: (req, res, error) => `${req.method} ${req.url} -> ${res.statusCode} ${error.message}`,
  customProps: (req) => ({
    requestId: req.requestId
  })
})

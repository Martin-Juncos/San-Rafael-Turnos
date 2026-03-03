import pino from 'pino'
import { config } from './env.js'

export const logger = pino({
  level: config.IS_PROD ? 'info' : 'debug',
  redact: {
    paths: [
      'req.headers.authorization',
      'req.body.password',
      'req.body.refreshToken',
      'req.body.code',
      'password',
      'passwordHash',
      'refreshToken',
      'code'
    ],
    remove: true
  }
})

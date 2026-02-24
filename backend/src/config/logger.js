import pino from 'pino'
import { config } from './env.js'

export const logger = pino({
  level: config.IS_PROD ? 'info' : 'debug',
  redact: {
    paths: ['req.headers.authorization', 'password', 'passwordHash', 'refreshToken', 'code'],
    remove: true
  }
})

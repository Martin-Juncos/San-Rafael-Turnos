import rateLimit from 'express-rate-limit'
import { config } from '../config/env.js'

export const globalLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false
})

export const authLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: Math.max(5, Math.floor(config.RATE_LIMIT_MAX / 4)),
  standardHeaders: true,
  legacyHeaders: false
})

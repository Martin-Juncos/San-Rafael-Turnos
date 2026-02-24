import rateLimit from 'express-rate-limit'
import { config } from '../config/env.js'

const isMessagesReadRoute = (req) => {
  if (req.method !== 'GET') return false
  return /^\/api\/appointments\/[^/]+\/messages$/.test(req.path)
}

export const globalLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX,
  skip: isMessagesReadRoute,
  standardHeaders: true,
  legacyHeaders: false
})

export const authLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: Math.max(5, Math.floor(config.RATE_LIMIT_MAX / 4)),
  standardHeaders: true,
  legacyHeaders: false
})

export const messagesLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: Math.max(config.RATE_LIMIT_MAX, 600),
  standardHeaders: true,
  legacyHeaders: false
})

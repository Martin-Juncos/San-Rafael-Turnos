import rateLimit from 'express-rate-limit'
import { config } from '../config/env.js'

const getRequestPath = (req) => {
  const raw = req.originalUrl || req.url || req.path || ''
  return raw.split('?')[0]
}

const isMessagesRoute = (req) => {
  const path = getRequestPath(req)
  return /^\/(?:api\/)?appointments\/[^/]+\/messages\/?$/.test(path)
}

const sharedHeaders = {
  standardHeaders: true,
  legacyHeaders: false
}

export const globalLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX,
  skip: isMessagesRoute,
  ...sharedHeaders
})

export const authLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: Math.max(5, Math.floor(config.RATE_LIMIT_MAX / 4)),
  ...sharedHeaders
})

export const messagesLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: Math.max(config.RATE_LIMIT_MAX * 5, 1200),
  ...sharedHeaders
})

export const paymentsLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: Math.max(10, Math.floor(config.RATE_LIMIT_MAX / 3)),
  ...sharedHeaders
})

export const webhookLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: Math.max(config.RATE_LIMIT_MAX * 3, 600),
  ...sharedHeaders
})

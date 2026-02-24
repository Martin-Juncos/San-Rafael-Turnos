import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { config } from '../config/env.js'

export const signAccessToken = (claims) => {
  return jwt.sign(claims, config.JWT_ACCESS_SECRET, {
    algorithm: 'HS256',
    expiresIn: config.JWT_ACCESS_EXPIRES_IN
  })
}

export const verifyAccessToken = (token) => {
  return jwt.verify(token, config.JWT_ACCESS_SECRET, { algorithms: ['HS256'] })
}

export const createRefreshToken = () => {
  const plainToken = crypto.randomBytes(48).toString('hex')
  const tokenHash = crypto.createHash('sha256').update(plainToken).digest('hex')
  return { plainToken, tokenHash }
}

export const hashRefreshToken = (plainToken) => {
  return crypto.createHash('sha256').update(plainToken).digest('hex')
}

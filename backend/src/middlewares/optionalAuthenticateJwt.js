import { verifyAccessToken } from '../utils/jwt.js'

export const optionalAuthenticateJwt = (req, _res, next) => {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next()
  }

  try {
    const token = authHeader.slice('Bearer '.length).trim()
    req.auth = verifyAccessToken(token)
  } catch (_error) {
    req.auth = undefined
  }
  return next()
}

import { verifyAccessToken } from '../utils/jwt.js'
import { AppError } from '../utils/errors.js'

export const authenticateJwt = (req, _res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No autorizado', 401, 'unauthorized')
    }

    const token = authHeader.slice('Bearer '.length).trim()
    const payload = verifyAccessToken(token)
    req.auth = payload
    next()
  } catch (_error) {
    next(new AppError('No autorizado', 401, 'unauthorized'))
  }
}

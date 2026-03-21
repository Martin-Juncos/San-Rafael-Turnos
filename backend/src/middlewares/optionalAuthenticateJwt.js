import { verifyAccessToken } from '../utils/jwt.js'
import { attachEffectiveDoctorId } from '../utils/doctorScope.js'

export const optionalAuthenticateJwt = (req, _res, next) => {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next()
  }

  try {
    const token = authHeader.slice('Bearer '.length).trim()
    req.auth = verifyAccessToken(token)
    attachEffectiveDoctorId(req)
  } catch (_error) {
    req.auth = undefined
  }
  return next()
}

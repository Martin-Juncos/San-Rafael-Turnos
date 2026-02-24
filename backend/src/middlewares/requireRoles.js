import { AppError } from '../utils/errors.js'

export const requireRoles = (...allowedRoles) => (req, _res, next) => {
  const role = req.auth?.role
  if (!role || !allowedRoles.includes(role)) {
    return next(new AppError('Prohibido', 403, 'forbidden'))
  }
  return next()
}

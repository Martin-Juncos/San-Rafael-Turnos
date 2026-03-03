import { AppError } from '../utils/errors.js'

const resolvePath = (source, path) => {
  return String(path)
    .split('.')
    .reduce((acc, key) => (acc ? acc[key] : undefined), source)
}

const hasPrivilegedRole = (role) => role === 'admin' || role === 'clinic'

export const requireOwnership = ({ ownerType, path }) => (req, _res, next) => {
  const role = req.auth?.role
  if (!role) {
    return next(new AppError('No autorizado', 401, 'unauthorized'))
  }
  if (hasPrivilegedRole(role)) {
    return next()
  }

  const targetOwnerId = resolvePath(req, path)
  if (!targetOwnerId) {
    return next(new AppError('No se pudo validar ownership', 400, 'invalid_ownership_target'))
  }

  if (ownerType === 'doctor') {
    if (role === 'doctor' && req.auth?.doctorId === targetOwnerId) {
      return next()
    }
    return next(new AppError('Prohibido', 403, 'forbidden'))
  }

  if (ownerType === 'patient') {
    if (role === 'patient' && req.auth?.patientId === targetOwnerId) {
      return next()
    }
    return next(new AppError('Prohibido', 403, 'forbidden'))
  }

  return next(new AppError('Ownership no soportado', 500, 'ownership_not_supported'))
}

export const requireDoctorOwnershipByParam = (path = 'validated.params.id') => {
  return requireOwnership({ ownerType: 'doctor', path })
}

export const requirePatientOwnershipByParam = (path = 'validated.params.id') => {
  return requireOwnership({ ownerType: 'patient', path })
}

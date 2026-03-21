import { AppError } from './errors.js'

export const DOCTOR_CONTEXT_HEADER = 'x-doctor-context'

export const hasPrivilegedRole = (role) => role === 'admin' || role === 'clinic'

export const getDoctorScopeIds = (auth = {}) => {
  if (!auth) return []
  if (auth.role === 'doctor') {
    return auth.doctorId ? [auth.doctorId] : []
  }
  if (auth.role === 'secretary') {
    return Array.isArray(auth.doctorIds)
      ? auth.doctorIds.filter(Boolean)
      : []
  }
  return []
}

export const hasDoctorScopeAccess = (auth, doctorId) => {
  if (!doctorId) return false
  if (hasPrivilegedRole(auth?.role)) return true
  return getDoctorScopeIds(auth).includes(doctorId)
}

export const resolveEffectiveDoctorId = ({ auth, requestedDoctorId }) => {
  if (!auth) return null

  if (auth.role === 'doctor') {
    return auth.doctorId || null
  }

  if (auth.role !== 'secretary') {
    return null
  }

  const allowedDoctorIds = getDoctorScopeIds(auth)
  if (allowedDoctorIds.length === 0) {
    return null
  }

  if (requestedDoctorId) {
    if (!allowedDoctorIds.includes(requestedDoctorId)) {
      throw new AppError('La secretaria no tiene acceso a ese medico', 403, 'doctor_scope_forbidden')
    }
    return requestedDoctorId
  }

  if (allowedDoctorIds.length === 1) {
    return allowedDoctorIds[0]
  }

  return null
}

export const attachEffectiveDoctorId = (req) => {
  if (!req?.auth) {
    return
  }

  const headerValue = req.headers?.[DOCTOR_CONTEXT_HEADER]
  const requestedDoctorId = typeof headerValue === 'string'
    ? headerValue.trim() || null
    : null

  req.auth.doctorIds = getDoctorScopeIds(req.auth)
  req.auth.effectiveDoctorId = resolveEffectiveDoctorId({
    auth: req.auth,
    requestedDoctorId
  })
}

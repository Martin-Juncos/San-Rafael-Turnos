import bcrypt from 'bcryptjs'
import { Op } from 'sequelize'
import { z } from 'zod'
import { config } from '../config/env.js'
import { User, RefreshToken, Doctor, sequelize } from '../db/models/index.js'
import { AppError } from '../utils/errors.js'
import { createRefreshToken, hashRefreshToken, signAccessToken } from '../utils/jwt.js'
import { ok } from '../utils/response.js'
import { writeAuditLog } from '../utils/audit.js'

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1)
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional()
})

export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(16)
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional()
})

export const logoutSchema = refreshSchema

const doctorScopeAttributes = ['id', 'fullName', 'specialtyId', 'consultorio', 'isActive']

const serializeDoctorScope = (doctor) => ({
  id: doctor.id,
  fullName: doctor.fullName,
  specialtyId: doctor.specialtyId,
  consultorio: doctor.consultorio,
  isActive: doctor.isActive
})

const buildDoctorScopes = (user) => {
  if (user.role === 'doctor') {
    return user.doctor ? [serializeDoctorScope(user.doctor)] : []
  }

  if (user.role === 'secretary') {
    return Array.isArray(user.linkedDoctors)
      ? user.linkedDoctors.map(serializeDoctorScope)
      : []
  }

  return []
}

const sanitizeUser = (user) => {
  const doctorScopes = buildDoctorScopes(user)

  return {
    id: user.id,
    role: user.role,
    accountType: user.accountType,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    dni: user.dni,
    doctorId: user.doctorId,
    doctorScopes,
    activeDoctorId: doctorScopes[0]?.id ?? user.doctorId ?? null,
    isActive: user.isActive
  }
}

const ensureMedicalContextLinked = (user) => {
  if (user.role === 'doctor' && !user.doctorId) {
    throw new AppError(
      'El usuario medico no esta vinculado a un perfil de medico. Contacte al administrador.',
      403,
      'doctor_profile_not_linked'
    )
  }
  if (user.role === 'secretary' && buildDoctorScopes(user).length === 0) {
    throw new AppError(
      'La secretaria no tiene medicos vinculados. Contacte al administrador.',
      403,
      'secretary_doctors_not_linked'
    )
  }
}

const sessionUserInclude = [
  {
    model: Doctor,
    as: 'doctor',
    attributes: doctorScopeAttributes
  },
  {
    model: Doctor,
    as: 'linkedDoctors',
    attributes: doctorScopeAttributes,
    through: { attributes: [] },
    required: false
  }
]

const buildTokensForUser = async ({ user, oldRefreshToken, ip, userAgent, transaction }) => {
  const doctorScopes = buildDoctorScopes(user)

  const accessToken = signAccessToken({
    sub: user.id,
    role: user.role,
    doctorId: user.doctorId ?? null,
    doctorIds: doctorScopes.map((item) => item.id)
  })

  const { plainToken, tokenHash } = createRefreshToken()
  const expiresAt = new Date(Date.now() + config.JWT_REFRESH_EXPIRES_DAYS * 24 * 60 * 60 * 1000)

  const created = await RefreshToken.create(
    {
      userId: user.id,
      tokenHash,
      expiresAt,
      createdByIp: ip ?? null,
      userAgent: userAgent ?? null
    },
    { transaction }
  )

  if (oldRefreshToken) {
    oldRefreshToken.revokedAt = new Date()
    oldRefreshToken.replacedByTokenId = created.id
    await oldRefreshToken.save({ transaction })
  }

  return {
    accessToken,
    refreshToken: plainToken
  }
}

export const login = async (req, res) => {
  const { email, password } = req.validated.body
  const user = await User.findOne({
    where: { email, isActive: true },
    include: sessionUserInclude
  })

  if (!user) {
    throw new AppError('Credenciales invalidas', 401, 'invalid_credentials')
  }

  const match = await bcrypt.compare(password, user.passwordHash)
  if (!match) {
    throw new AppError('Credenciales invalidas', 401, 'invalid_credentials')
  }
  ensureMedicalContextLinked(user)

  const tokens = await sequelize.transaction(async (transaction) => {
    return buildTokensForUser({
      user,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      transaction
    })
  })

  await writeAuditLog({
    actorRole: user.role,
    actorId: user.id,
    action: 'AUTH_LOGIN_SUCCESS',
    entity: 'User',
    entityId: user.id
  })

  ok(res, { user: sanitizeUser(user), ...tokens }, 'login_success')
}

export const refresh = async (req, res) => {
  const { refreshToken } = req.validated.body
  const tokenHash = hashRefreshToken(refreshToken)

  const current = await RefreshToken.findOne({
    where: {
      tokenHash,
      revokedAt: null,
      expiresAt: { [Op.gt]: new Date() }
    },
    include: [{
      model: User,
      as: 'user',
      include: sessionUserInclude
    }]
  })

  if (!current || !current.user || !current.user.isActive) {
    throw new AppError('Refresh token invalido', 401, 'invalid_refresh_token')
  }
  ensureMedicalContextLinked(current.user)

  const tokens = await sequelize.transaction(async (transaction) => {
    return buildTokensForUser({
      user: current.user,
      oldRefreshToken: current,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      transaction
    })
  })

  ok(
    res,
    {
      user: sanitizeUser(current.user),
      ...tokens
    },
    'refresh_success'
  )
}

export const logout = async (req, res) => {
  const { refreshToken } = req.validated.body
  const tokenHash = hashRefreshToken(refreshToken)

  const token = await RefreshToken.findOne({
    where: {
      tokenHash,
      revokedAt: null
    }
  })

  if (token) {
    token.revokedAt = new Date()
    await token.save()
  }

  ok(res, { revoked: Boolean(token) }, 'logout_success')
}

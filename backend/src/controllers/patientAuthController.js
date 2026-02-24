import bcrypt from 'bcryptjs'
import { Op } from 'sequelize'
import { z } from 'zod'
import { config } from '../config/env.js'
import { Patient, PatientOtp } from '../db/models/index.js'
import { sendOtpCode } from '../services/notificationService.js'
import { AppError } from '../utils/errors.js'
import { ok } from '../utils/response.js'
import { signAccessToken } from '../utils/jwt.js'

const normalizeDni = (dni) => String(dni).replace(/\D/g, '')
const normalizePhone = (phone) => String(phone).replace(/[^\d+]/g, '')

export const requestOtpSchema = z.object({
  body: z.object({
    dni: z.string().min(6).max(12),
    phone: z.string().min(8).max(20)
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional()
})

export const verifyOtpSchema = z.object({
  body: z.object({
    dni: z.string().min(6).max(12),
    code: z.string().regex(/^\d{4,8}$/)
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional()
})

const generateOtpCode = () => String(Math.floor(100000 + Math.random() * 900000))

export const requestOtp = async (req, res) => {
  const dni = normalizeDni(req.validated.body.dni)
  const phone = normalizePhone(req.validated.body.phone)
  const code = generateOtpCode()
  const codeHash = await bcrypt.hash(code, 10)
  const expiresAt = new Date(Date.now() + config.OTP_TTL_SECONDS * 1000)

  await PatientOtp.create({
    dni,
    phone,
    codeHash,
    expiresAt
  })

  await sendOtpCode({ dni, phone, code })

  ok(
    res,
    {
      dni,
      phone,
      expiresAt,
      ...(config.NODE_ENV !== 'production' ? { debugCode: code } : {})
    },
    'otp_sent',
    201
  )
}

export const verifyOtp = async (req, res) => {
  const dni = normalizeDni(req.validated.body.dni)
  const { code } = req.validated.body

  const otp = await PatientOtp.findOne({
    where: {
      dni,
      consumedAt: null,
      expiresAt: {
        [Op.gt]: new Date()
      }
    },
    order: [['createdAt', 'DESC']]
  })

  if (!otp) {
    throw new AppError('Codigo invalido o expirado', 401, 'invalid_otp')
  }

  const match = await bcrypt.compare(code, otp.codeHash)
  if (!match) {
    throw new AppError('Codigo invalido o expirado', 401, 'invalid_otp')
  }

  otp.consumedAt = new Date()
  await otp.save()

  const [patient] = await Patient.findOrCreate({
    where: { dni },
    defaults: {
      dni,
      phone: otp.phone,
      fullName: `Paciente ${dni}`
    }
  })

  const accessToken = signAccessToken({
    sub: patient.id,
    role: 'patient',
    patientId: patient.id,
    dni: patient.dni
  })

  ok(
    res,
    {
      token: accessToken,
      patient: {
        id: patient.id,
        dni: patient.dni,
        fullName: patient.fullName,
        phone: patient.phone
      }
    },
    'otp_verified'
  )
}

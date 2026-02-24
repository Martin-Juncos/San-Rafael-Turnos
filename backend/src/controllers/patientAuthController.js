import { z } from 'zod'
import { Patient } from '../db/models/index.js'
import { AppError } from '../utils/errors.js'
import { signAccessToken } from '../utils/jwt.js'
import { ok } from '../utils/response.js'

const normalizeDni = (dni) => String(dni).replace(/\D/g, '')
const normalizePhone = (phone) => String(phone).replace(/[^\d+]/g, '')

export const patientLoginSchema = z.object({
  body: z.object({
    fullName: z.string().min(3).max(120),
    dni: z.string().min(6).max(12),
    phone: z.string().min(8).max(20)
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional()
})

export const loginPatient = async (req, res) => {
  const fullName = req.validated.body.fullName.trim()
  const dni = normalizeDni(req.validated.body.dni)
  const phone = normalizePhone(req.validated.body.phone)

  if (dni.length < 6 || dni.length > 12) {
    throw new AppError('DNI invalido', 400, 'invalid_dni')
  }
  if (phone.length < 8 || phone.length > 20) {
    throw new AppError('Telefono invalido', 400, 'invalid_phone')
  }

  const [patient] = await Patient.findOrCreate({
    where: { dni },
    defaults: {
      dni,
      fullName,
      phone
    }
  })

  await patient.update({
    fullName,
    phone
  })

  const token = signAccessToken({
    sub: patient.id,
    role: 'patient',
    patientId: patient.id,
    dni: patient.dni
  })

  ok(
    res,
    {
      token,
      patient: {
        id: patient.id,
        dni: patient.dni,
        fullName: patient.fullName,
        phone: patient.phone
      }
    },
    'patient_login_success'
  )
}

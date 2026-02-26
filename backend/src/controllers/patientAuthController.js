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
    phone: z.string().min(8).max(20),
    streetAndNumber: z.string().min(3).max(160).optional(),
    city: z.string().min(2).max(120).optional()
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional()
})

export const patientPrefillSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({
    dni: z.string().min(6).max(12)
  }),
  params: z.object({}).optional()
})

export const loginPatient = async (req, res) => {
  const fullName = req.validated.body.fullName.trim()
  const dni = normalizeDni(req.validated.body.dni)
  const phone = normalizePhone(req.validated.body.phone)
  const hasStreetAndNumber = typeof req.validated.body.streetAndNumber !== 'undefined'
  const hasCity = typeof req.validated.body.city !== 'undefined'
  const streetAndNumber = hasStreetAndNumber ? req.validated.body.streetAndNumber.trim() : null
  const city = hasCity ? req.validated.body.city.trim() : null

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
      phone,
      streetAndNumber: streetAndNumber || null,
      city: city || null
    }
  })

  const updatePayload = {
    fullName,
    phone
  }

  if (hasStreetAndNumber) {
    updatePayload.streetAndNumber = streetAndNumber || null
  }
  if (hasCity) {
    updatePayload.city = city || null
  }

  await patient.update(updatePayload)

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
        phone: patient.phone,
        streetAndNumber: patient.streetAndNumber,
        city: patient.city
      }
    },
    'patient_login_success'
  )
}

export const prefillPatientByDni = async (req, res) => {
  const dni = normalizeDni(req.validated.query.dni)

  if (dni.length < 6 || dni.length > 12) {
    throw new AppError('DNI invalido', 400, 'invalid_dni')
  }

  const patient = await Patient.findOne({
    where: { dni },
    attributes: ['dni', 'fullName', 'phone', 'streetAndNumber', 'city']
  })

  ok(
    res,
    patient
      ? {
          exists: true,
          patient: {
            dni: patient.dni,
            fullName: patient.fullName,
            phone: patient.phone,
            streetAndNumber: patient.streetAndNumber,
            city: patient.city
          }
        }
      : {
          exists: false,
          patient: null
        },
    'patient_prefill_checked'
  )
}

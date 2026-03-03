import { z } from 'zod'
import { Patient } from '../db/models/index.js'
import { signAccessToken } from '../utils/jwt.js'
import { ok } from '../utils/response.js'
import { dniSchema, phoneSchema } from '../validators/common.js'

export const patientLoginSchema = z.object({
  body: z.object({
    fullName: z.string().min(3).max(120),
    dni: dniSchema,
    phone: phoneSchema,
    streetAndNumber: z.string().min(3).max(160).optional(),
    city: z.string().min(2).max(120).optional()
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional()
})

export const patientPrefillSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({
    dni: dniSchema
  }),
  params: z.object({}).optional()
})

export const loginPatient = async (req, res) => {
  const fullName = req.validated.body.fullName.trim()
  const dni = req.validated.body.dni
  const phone = req.validated.body.phone
  const hasStreetAndNumber = typeof req.validated.body.streetAndNumber !== 'undefined'
  const hasCity = typeof req.validated.body.city !== 'undefined'
  const streetAndNumber = hasStreetAndNumber ? req.validated.body.streetAndNumber.trim() : null
  const city = hasCity ? req.validated.body.city.trim() : null

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
  const dni = req.validated.query.dni

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

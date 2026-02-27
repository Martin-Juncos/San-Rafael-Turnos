import { Op } from 'sequelize'
import { z } from 'zod'
import {
  Appointment,
  Doctor,
  Patient,
  Specialty,
  HealthInsurance,
  Payment,
  sequelize
} from '../db/models/index.js'
import { AppError } from '../utils/errors.js'
import { ok, paginated } from '../utils/response.js'
import { parsePagination, buildPagination } from '../utils/pagination.js'
import { addMinutesToTime } from '../utils/time.js'
import { createMockPaymentIntent } from '../services/paymentService.js'
import {
  ensureDoctorAvailableAtSlot,
  ensureNoSlotConflict,
  releaseExpiredHolds
} from '../services/appointmentService.js'
import { writeAuditLog } from '../utils/audit.js'

const createAppointmentBodySchema = z.object({
  doctorId: z.string().uuid(),
  specialtyId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  insuranceId: z.string().uuid().optional(),
  symptoms: z.string().max(4000).optional(),
  fullName: z.string().min(3).max(120),
  dni: z.string().min(6).max(12),
  phone: z.string().min(8).max(20),
  streetAndNumber: z.string().min(3).max(160).optional(),
  city: z.string().min(2).max(120).optional(),
  slotMinutes: z.coerce.number().int().min(10).max(120).optional()
})

export const createAppointmentSchema = z.object({
  body: createAppointmentBodySchema,
  params: z.object({}).optional(),
  query: z.object({}).optional()
})

export const myAppointmentsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    pageSize: z.coerce.number().int().positive().optional()
  }).optional()
})

export const listAppointmentsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    pageSize: z.coerce.number().int().positive().optional(),
    doctorId: z.string().uuid().optional(),
    specialtyId: z.string().uuid().optional(),
    dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    status: z.string().optional(),
    patientDni: z.string().optional()
  }).optional()
})

export const appointmentIdSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid()
  })
})

export const patchAppointmentSchema = z.object({
  body: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    slotMinutes: z.coerce.number().int().min(10).max(120).optional(),
    symptoms: z.string().max(4000).optional(),
    status: z.enum(['requested', 'hold', 'confirmed', 'cancelled', 'rescheduled', 'attended', 'no_show']).optional(),
    cancelReason: z.string().max(250).optional(),
    doctorNotes: z.string().max(4000).optional()
  }).refine((value) => Object.keys(value).length > 0, 'Sin campos para actualizar'),
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid()
  })
})

export const cancelAppointmentSchema = z.object({
  body: z.object({
    reason: z.string().max(250).optional()
  }).optional(),
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid()
  })
})

export const rescheduleAppointmentSchema = z.object({
  body: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    slotMinutes: z.coerce.number().int().min(10).max(120).optional()
  }),
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid()
  })
})

const includeDefault = [
  { model: Doctor, as: 'doctor' },
  { model: Specialty, as: 'specialty' },
  { model: HealthInsurance, as: 'insurance' },
  { model: Patient, as: 'patient' },
  { model: Payment, as: 'payment' }
]

const ensureAppointmentPermission = (auth, appointment) => {
  if (!auth) {
    throw new AppError('No autorizado', 401, 'unauthorized')
  }
  if (auth.role === 'admin' || auth.role === 'clinic') {
    return
  }
  if (auth.role === 'doctor' && auth.doctorId === appointment.doctorId) {
    return
  }
  if (auth.role === 'patient' && auth.patientId === appointment.patientId) {
    return
  }
  throw new AppError('Prohibido', 403, 'forbidden')
}

const normalizePatientPayload = ({ fullName, dni, phone, streetAndNumber, city }) => {
  const normalized = {
    fullName: fullName.trim(),
    dni: String(dni).replace(/\D/g, ''),
    phone: String(phone).replace(/[^\d+]/g, '')
  }

  if (typeof streetAndNumber !== 'undefined') {
    normalized.streetAndNumber = streetAndNumber.trim() || null
  }
  if (typeof city !== 'undefined') {
    normalized.city = city.trim() || null
  }

  return normalized
}

export const createAppointment = async (req, res) => {
  const payload = req.validated.body
  const slotMinutes = payload.slotMinutes ?? 30
  const endTime = addMinutesToTime(payload.startTime, slotMinutes)
  const actorRole = req.auth.role
  const actorId = req.auth.sub

  if (!['patient', 'clinic', 'admin', 'doctor'].includes(actorRole)) {
    throw new AppError('Prohibido', 403, 'forbidden')
  }

  const patientInput = normalizePatientPayload(payload)
  if (actorRole === 'patient' && req.auth.dni && req.auth.dni !== patientInput.dni) {
    throw new AppError('El DNI no coincide con tu sesion', 403, 'dni_mismatch')
  }

  let appointment
  let payment
  let paymentIntent
  let pricing = null

  try {
    await sequelize.transaction(async (transaction) => {
      await releaseExpiredHolds(transaction)
      await ensureDoctorAvailableAtSlot({
        doctorId: payload.doctorId,
        date: payload.date,
        startTime: payload.startTime,
        endTime,
        transaction
      })
      await ensureNoSlotConflict({
        doctorId: payload.doctorId,
        date: payload.date,
        startTime: payload.startTime,
        transaction
      })

      const [patient] = await Patient.findOrCreate({
        where: { dni: patientInput.dni },
        defaults: {
          dni: patientInput.dni,
          fullName: patientInput.fullName,
          phone: patientInput.phone,
          streetAndNumber: patientInput.streetAndNumber ?? null,
          city: patientInput.city ?? null
        },
        transaction
      })
      const patientUpdatePayload = {
        fullName: patientInput.fullName,
        phone: patientInput.phone
      }
      if ('streetAndNumber' in patientInput) {
        patientUpdatePayload.streetAndNumber = patientInput.streetAndNumber
      }
      if ('city' in patientInput) {
        patientUpdatePayload.city = patientInput.city
      }
      await patient.update(patientUpdatePayload, { transaction })

      const specialty = await Specialty.findByPk(payload.specialtyId, { transaction })
      if (!specialty) {
        throw new AppError('Especialidad no encontrada', 404, 'specialty_not_found')
      }

      let insurance = null
      if (payload.insuranceId) {
        insurance = await HealthInsurance.findOne({
          where: {
            id: payload.insuranceId,
            isActive: true
          },
          transaction
        })
        if (!insurance) {
          throw new AppError('Obra social no encontrada o inactiva', 404, 'insurance_not_found')
        }
      }

      const baseAmount = Number(specialty.fee)
      const discountPercent = insurance ? Number(insurance.discountPercent) : 0
      const discountedAmount = Math.max(0, Number((baseAmount - ((baseAmount * discountPercent) / 100)).toFixed(2)))
      pricing = {
        baseAmount,
        discountPercent,
        finalAmount: discountedAmount
      }

      appointment = await Appointment.create(
        {
          doctorId: payload.doctorId,
          specialtyId: payload.specialtyId,
          insuranceId: insurance?.id ?? null,
          patientId: patient.id,
          date: payload.date,
          startTime: payload.startTime,
          endTime,
          symptoms: payload.symptoms ?? null,
          discountPercentApplied: discountPercent,
          status: 'hold',
          createdByRole: actorRole,
          createdByUserId: actorId
        },
        { transaction }
      )

      payment = await Payment.create(
        {
          appointmentId: appointment.id,
          provider: 'mock',
          amount: discountedAmount,
          currency: 'ARS',
          status: 'pending'
        },
        { transaction }
      )

      paymentIntent = createMockPaymentIntent({
        appointmentId: appointment.id,
        amount: discountedAmount
      })

      await writeAuditLog({
        actorRole,
        actorId,
        action: 'APPOINTMENT_CREATED_HOLD',
        entity: 'Appointment',
        entityId: appointment.id,
        meta: {
          doctorId: payload.doctorId,
          date: payload.date,
          startTime: payload.startTime,
          insuranceId: insurance?.id ?? null,
          discountPercent
        },
        transaction
      })
    })
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      throw new AppError('Ese horario ya no esta disponible', 409, 'slot_conflict')
    }
    throw error
  }

  ok(
    res,
    {
      appointment,
      payment,
      paymentIntent,
      pricing
    },
    'appointment_created_hold',
    201
  )
}

export const listMyAppointments = async (req, res) => {
  if (req.auth.role !== 'patient') {
    throw new AppError('Prohibido', 403, 'forbidden')
  }
  const { query = {} } = req.validated
  const { page, pageSize, offset, limit } = parsePagination(query)

  const { rows, count } = await Appointment.findAndCountAll({
    where: {
      patientId: req.auth.patientId
    },
    include: includeDefault,
    order: [['date', 'DESC'], ['startTime', 'DESC']],
    offset,
    limit
  })

  paginated(res, rows, buildPagination({ page, pageSize, total: count }))
}

export const listAppointments = async (req, res) => {
  if (!['clinic', 'admin', 'doctor'].includes(req.auth.role)) {
    throw new AppError('Prohibido', 403, 'forbidden')
  }
  const { query = {} } = req.validated
  const { page, pageSize, offset, limit } = parsePagination(query)

  const where = {}
  if (req.auth.role === 'doctor') {
    where.doctorId = req.auth.doctorId
  }
  if (query.doctorId && req.auth.role !== 'doctor') where.doctorId = query.doctorId
  if (query.specialtyId) where.specialtyId = query.specialtyId
  if (query.status) where.status = query.status
  if (query.dateFrom || query.dateTo) {
    where.date = {}
    if (query.dateFrom) where.date[Op.gte] = query.dateFrom
    if (query.dateTo) where.date[Op.lte] = query.dateTo
  }

  const patientWhere = {}
  if (query.patientDni) {
    patientWhere.dni = {
      [Op.iLike]: `%${query.patientDni}%`
    }
  }

  const { rows, count } = await Appointment.findAndCountAll({
    where,
    include: includeDefault.map((entry) => {
      if (entry.as === 'patient' && Object.keys(patientWhere).length > 0) {
        return { ...entry, where: patientWhere }
      }
      return entry
    }),
    order: [['date', 'DESC'], ['startTime', 'DESC']],
    offset,
    limit
  })

  paginated(res, rows, buildPagination({ page, pageSize, total: count }))
}

export const getAppointmentById = async (req, res) => {
  const item = await Appointment.findByPk(req.validated.params.id, {
    include: includeDefault
  })
  if (!item) {
    throw new AppError('Turno no encontrado', 404, 'appointment_not_found')
  }
  ensureAppointmentPermission(req.auth, item)
  ok(res, item)
}

const applyPatchByRole = ({ role, body }) => {
  if (role === 'admin' || role === 'clinic') {
    return body
  }
  if (role === 'doctor') {
    const allowed = {}
    if (body.date) {
      allowed.date = body.date
    }
    if (body.startTime) {
      allowed.startTime = body.startTime
    }
    if (body.slotMinutes) {
      allowed.slotMinutes = body.slotMinutes
    }
    if (body.status) {
      allowed.status = body.status
    }
    if (typeof body.symptoms === 'string') {
      allowed.symptoms = body.symptoms
    }
    if (typeof body.doctorNotes === 'string') {
      allowed.doctorNotes = body.doctorNotes
    }
    if (body.cancelReason) {
      allowed.cancelReason = body.cancelReason
    }
    return allowed
  }
  return {}
}

export const patchAppointment = async (req, res) => {
  const item = await Appointment.findByPk(req.validated.params.id, {
    include: [{ model: Payment, as: 'payment' }]
  })
  if (!item) {
    throw new AppError('Turno no encontrado', 404, 'appointment_not_found')
  }
  ensureAppointmentPermission(req.auth, item)

  const patch = applyPatchByRole({ role: req.auth.role, body: req.validated.body })
  if (Object.keys(patch).length === 0) {
    throw new AppError('No hay campos permitidos para actualizar', 400, 'invalid_patch')
  }

  const nextDate = patch.date ?? item.date
  const nextStart = patch.startTime ?? item.startTime
  const slotMinutes = patch.slotMinutes ?? 30
  const nextEnd = addMinutesToTime(nextStart.slice(0, 5), slotMinutes)

  if (patch.date || patch.startTime) {
    await sequelize.transaction(async (transaction) => {
      await ensureDoctorAvailableAtSlot({
        doctorId: item.doctorId,
        date: nextDate,
        startTime: nextStart,
        endTime: nextEnd,
        transaction
      })
      await ensureNoSlotConflict({
        doctorId: item.doctorId,
        date: nextDate,
        startTime: nextStart,
        excludeAppointmentId: item.id,
        transaction
      })
      patch.endTime = nextEnd
      await item.update(patch, { transaction })
    })
  } else {
    await item.update(patch)
  }

  await writeAuditLog({
    actorRole: req.auth.role,
    actorId: req.auth.sub,
    action: 'APPOINTMENT_PATCHED',
    entity: 'Appointment',
    entityId: item.id,
    meta: patch
  })

  const refreshed = await Appointment.findByPk(item.id, { include: includeDefault })
  ok(res, refreshed, 'appointment_updated')
}

export const cancelAppointment = async (req, res) => {
  const item = await Appointment.findByPk(req.validated.params.id)
  if (!item) {
    throw new AppError('Turno no encontrado', 404, 'appointment_not_found')
  }
  ensureAppointmentPermission(req.auth, item)

  if (req.auth.role === 'patient' && !['hold', 'confirmed'].includes(item.status)) {
    throw new AppError('No se puede cancelar este turno en su estado actual', 400, 'invalid_status')
  }

  const reason = req.validated.body?.reason ?? 'cancelled_by_user'
  await item.update({
    status: 'cancelled',
    cancelReason: reason
  })

  await writeAuditLog({
    actorRole: req.auth.role,
    actorId: req.auth.sub,
    action: 'APPOINTMENT_CANCELLED',
    entity: 'Appointment',
    entityId: item.id,
    meta: { reason }
  })

  ok(res, item, 'appointment_cancelled')
}

export const rescheduleAppointment = async (req, res) => {
  if (!['clinic', 'admin'].includes(req.auth.role)) {
    throw new AppError('Prohibido', 403, 'forbidden')
  }

  const item = await Appointment.findByPk(req.validated.params.id, {
    include: [{ model: Payment, as: 'payment' }]
  })
  if (!item) {
    throw new AppError('Turno no encontrado', 404, 'appointment_not_found')
  }

  const slotMinutes = req.validated.body.slotMinutes ?? 30
  const nextEnd = addMinutesToTime(req.validated.body.startTime, slotMinutes)
  const nextStatus = item.payment?.status === 'paid' ? 'confirmed' : 'hold'

  await sequelize.transaction(async (transaction) => {
    await ensureDoctorAvailableAtSlot({
      doctorId: item.doctorId,
      date: req.validated.body.date,
      startTime: req.validated.body.startTime,
      endTime: nextEnd,
      transaction
    })
    await ensureNoSlotConflict({
      doctorId: item.doctorId,
      date: req.validated.body.date,
      startTime: req.validated.body.startTime,
      excludeAppointmentId: item.id,
      transaction
    })
    await item.update(
      {
        date: req.validated.body.date,
        startTime: req.validated.body.startTime,
        endTime: nextEnd,
        status: nextStatus
      },
      { transaction }
    )
  })

  await writeAuditLog({
    actorRole: req.auth.role,
    actorId: req.auth.sub,
    action: 'APPOINTMENT_RESCHEDULED',
    entity: 'Appointment',
    entityId: item.id,
    meta: {
      date: req.validated.body.date,
      startTime: req.validated.body.startTime
    }
  })

  ok(res, item, 'appointment_rescheduled')
}

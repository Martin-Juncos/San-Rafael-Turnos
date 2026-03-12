import { z } from 'zod'
import {
  Appointment,
  Payment,
  sequelize
} from '../db/models/index.js'
import { AppError } from '../utils/errors.js'
import { ok, paginated } from '../utils/response.js'
import { addMinutesToTime } from '../utils/time.js'
import {
  dniSchema,
  emailSchema,
  phoneSchema,
  isoDateSchema,
  hhmmSchema,
  optionalPaginationQuerySchema
} from '../validators/common.js'
import {
  ensureDoctorAvailableAtSlot,
  ensureNoSlotConflict
} from '../services/appointmentService.js'
import { writeAuditLog } from '../utils/audit.js'
import {
  createAppointmentWithHold,
  listPatientAppointments,
  listScopedAppointments
} from '../services/appointmentCrudService.js'
import {
  appointmentDefaultInclude,
  findAppointmentById
} from '../repositories/appointmentRepository.js'

const createAppointmentBodySchema = z.object({
  doctorId: z.string().uuid(),
  specialtyId: z.string().uuid(),
  date: isoDateSchema,
  startTime: hhmmSchema,
  insuranceId: z.string().uuid().optional(),
  symptoms: z.string().max(4000).optional(),
  fullName: z.string().min(3).max(120),
  dni: dniSchema,
  phone: phoneSchema,
  email: emailSchema.optional(),
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
  query: optionalPaginationQuerySchema
})

export const listAppointmentsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    pageSize: z.coerce.number().int().positive().optional(),
    doctorId: z.string().uuid().optional(),
    specialtyId: z.string().uuid().optional(),
    dateFrom: isoDateSchema.optional(),
    dateTo: isoDateSchema.optional(),
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
    date: isoDateSchema.optional(),
    startTime: hhmmSchema.optional(),
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
    date: isoDateSchema,
    startTime: hhmmSchema,
    slotMinutes: z.coerce.number().int().min(10).max(120).optional()
  }),
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid()
  })
})

const includeDefault = appointmentDefaultInclude

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

export const createAppointment = async (req, res) => {
  const created = await createAppointmentWithHold({
    payload: req.validated.body,
    auth: req.auth
  })

  ok(
    res,
    created,
    'appointment_created_hold',
    201
  )
}

export const listMyAppointments = async (req, res) => {
  if (req.auth.role !== 'patient') {
    throw new AppError('Prohibido', 403, 'forbidden')
  }
  const { query = {} } = req.validated
  const { rows, pagination } = await listPatientAppointments({
    patientId: req.auth.patientId,
    query
  })

  paginated(res, rows, pagination)
}

export const listAppointments = async (req, res) => {
  if (!['clinic', 'admin', 'doctor'].includes(req.auth.role)) {
    throw new AppError('Prohibido', 403, 'forbidden')
  }
  const { query = {} } = req.validated
  const { rows, pagination } = await listScopedAppointments({
    auth: req.auth,
    query
  })

  paginated(res, rows, pagination)
}

export const getAppointmentById = async (req, res) => {
  const item = await findAppointmentById({
    appointmentId: req.validated.params.id,
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

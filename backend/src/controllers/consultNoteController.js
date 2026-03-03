import { z } from 'zod'
import { Appointment, ConsultNote, Doctor, Patient, Specialty, sequelize } from '../db/models/index.js'
import { AppError } from '../utils/errors.js'
import { ok } from '../utils/response.js'
import { writeAuditLog } from '../utils/audit.js'
import { isoDateSchema } from '../validators/common.js'

const CONSULT_NOTE_EDIT_WINDOW_HOURS = 24

const FINAL_STATUS_TO_APPOINTMENT_STATUS = {
  attended: 'attended',
  no_show: 'no_show',
  requires_reschedule: 'rescheduled'
}

const consultNoteBodyBaseSchema = z.object({
  subjective: z.string().min(1).max(8000),
  objective: z.string().max(8000).optional().nullable(),
  assessment: z.string().max(4000).optional().nullable(),
  plan: z.string().min(1).max(8000),
  followUp: z.string().max(4000).optional().nullable(),
  internalNotes: z.string().max(8000).optional().nullable(),
  statusFinal: z.enum(['attended', 'no_show', 'requires_reschedule']),
  referred: z.boolean().optional(),
  referralTo: z.string().max(250).optional().nullable(),
  nextSuggestedType: z.enum(['date', 'as_needed']).optional().nullable(),
  nextSuggestedDate: isoDateSchema.optional().nullable()
})

const validateConsultNoteCrossFields = (value, context) => {
  if (value.referred && !String(value.referralTo || '').trim()) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['referralTo'],
      message: 'Debe indicar a donde se deriva'
    })
  }

  if (value.nextSuggestedType === 'date' && !value.nextSuggestedDate) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['nextSuggestedDate'],
      message: 'Debe indicar una fecha sugerida'
    })
  }
}

const consultNoteBodySchema = consultNoteBodyBaseSchema.superRefine(validateConsultNoteCrossFields)

const consultNotePatchSchema = consultNoteBodyBaseSchema
  .partial()
  .superRefine(validateConsultNoteCrossFields)
  .refine((value) => Object.keys(value).length > 0, 'Sin campos para actualizar')

export const consultNoteIdSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid()
  })
})

export const createConsultNoteSchema = z.object({
  body: consultNoteBodySchema,
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid()
  })
})

export const patchConsultNoteSchema = z.object({
  body: consultNotePatchSchema,
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid()
  })
})

const sanitizeNullable = (value) => {
  if (value === null || typeof value === 'undefined') {
    return null
  }
  const trimmed = String(value).trim()
  return trimmed || null
}

const ensureConsultNoteRole = (auth) => {
  if (['admin', 'clinic', 'doctor'].includes(auth.role)) return
  throw new AppError('Prohibido', 403, 'forbidden')
}

const ensureAppointmentScope = (auth, appointment) => {
  if (auth.role === 'admin' || auth.role === 'clinic') return
  if (auth.role === 'doctor' && auth.doctorId === appointment.doctorId) return
  throw new AppError('Prohibido', 403, 'forbidden')
}

const canDoctorEditWithinWindow = (auth, note) => {
  if (auth.role !== 'doctor') return false
  if (auth.doctorId !== note.doctorId) return false
  const diffMs = Date.now() - new Date(note.createdAt).getTime()
  const windowMs = CONSULT_NOTE_EDIT_WINDOW_HOURS * 60 * 60 * 1000
  return diffMs <= windowMs
}

const canEditConsultNote = (auth, note) => {
  if (auth.role === 'admin' || auth.role === 'clinic') return true
  return canDoctorEditWithinWindow(auth, note)
}

const buildConsultNotePayload = ({ body, appointment, actorId }) => {
  const referred = body.referred ?? false
  const nextSuggestedType = body.nextSuggestedType ?? null
  const subjective = sanitizeNullable(body.subjective) || sanitizeNullable(appointment.symptoms) || 'Sin datos referidos por paciente.'
  const plan = sanitizeNullable(body.plan) || 'Sin indicaciones registradas.'

  return {
    appointmentId: appointment.id,
    doctorId: appointment.doctorId,
    patientId: appointment.patientId,
    subjective,
    objective: sanitizeNullable(body.objective),
    assessment: sanitizeNullable(body.assessment),
    plan,
    followUp: sanitizeNullable(body.followUp),
    internalNotes: sanitizeNullable(body.internalNotes),
    statusFinal: body.statusFinal,
    referred,
    referralTo: referred ? sanitizeNullable(body.referralTo) : null,
    nextSuggestedType,
    nextSuggestedDate: nextSuggestedType === 'date' ? body.nextSuggestedDate : null,
    createdByUserId: actorId,
    updatedByUserId: actorId
  }
}

const buildConsultNotePatch = ({ body, actorId }) => {
  const patch = {}
  if (typeof body.subjective !== 'undefined') {
    const normalized = sanitizeNullable(body.subjective)
    if (!normalized) {
      throw new AppError('La evolucion/nota profesional no puede quedar vacia', 400, 'invalid_consult_note')
    }
    patch.subjective = normalized
  }
  if (typeof body.objective !== 'undefined') patch.objective = sanitizeNullable(body.objective)
  if (typeof body.assessment !== 'undefined') patch.assessment = sanitizeNullable(body.assessment)
  if (typeof body.plan !== 'undefined') {
    const normalized = sanitizeNullable(body.plan)
    if (!normalized) {
      throw new AppError('La conducta/indicaciones no puede quedar vacia', 400, 'invalid_consult_note')
    }
    patch.plan = normalized
  }
  if (typeof body.followUp !== 'undefined') patch.followUp = sanitizeNullable(body.followUp)
  if (typeof body.internalNotes !== 'undefined') patch.internalNotes = sanitizeNullable(body.internalNotes)
  if (typeof body.statusFinal !== 'undefined') patch.statusFinal = body.statusFinal
  if (typeof body.referred !== 'undefined') patch.referred = body.referred
  if (typeof body.referralTo !== 'undefined') patch.referralTo = sanitizeNullable(body.referralTo)
  if (typeof body.nextSuggestedType !== 'undefined') patch.nextSuggestedType = body.nextSuggestedType
  if (typeof body.nextSuggestedDate !== 'undefined') patch.nextSuggestedDate = body.nextSuggestedDate

  if ('referred' in patch && !patch.referred) {
    patch.referralTo = null
  }
  if ('nextSuggestedType' in patch && patch.nextSuggestedType !== 'date') {
    patch.nextSuggestedDate = null
  }

  patch.updatedByUserId = actorId
  return patch
}

const loadAppointmentForConsultNote = async (appointmentId) => {
  return Appointment.findByPk(appointmentId, {
    include: [
      { model: Doctor, as: 'doctor' },
      { model: Patient, as: 'patient' },
      { model: Specialty, as: 'specialty' }
    ]
  })
}

const loadConsultNoteWithRelations = async (appointmentId) => {
  return ConsultNote.findOne({
    where: { appointmentId },
    include: [
      { model: Doctor, as: 'doctor' },
      { model: Patient, as: 'patient' }
    ]
  })
}

const syncAppointmentStatusFromConsultNote = async ({ appointment, noteStatusFinal, transaction }) => {
  const nextStatus = FINAL_STATUS_TO_APPOINTMENT_STATUS[noteStatusFinal]
  if (!nextStatus || appointment.status === nextStatus) return
  await appointment.update({ status: nextStatus }, { transaction })
}

export const getConsultNoteByAppointment = async (req, res) => {
  ensureConsultNoteRole(req.auth)

  const appointment = await loadAppointmentForConsultNote(req.validated.params.id)
  if (!appointment) {
    throw new AppError('Turno no encontrado', 404, 'appointment_not_found')
  }
  ensureAppointmentScope(req.auth, appointment)

  const consultNote = await loadConsultNoteWithRelations(appointment.id)
  const canCreate = !consultNote && appointment.status !== 'cancelled'
  const canEdit = consultNote ? canEditConsultNote(req.auth, consultNote) : false

  ok(res, {
    appointment,
    consultNote,
    permissions: {
      canCreate,
      canEdit,
      editWindowHours: CONSULT_NOTE_EDIT_WINDOW_HOURS
    }
  })
}

export const createConsultNoteByAppointment = async (req, res) => {
  ensureConsultNoteRole(req.auth)

  const appointment = await loadAppointmentForConsultNote(req.validated.params.id)
  if (!appointment) {
    throw new AppError('Turno no encontrado', 404, 'appointment_not_found')
  }
  ensureAppointmentScope(req.auth, appointment)

  const existing = await ConsultNote.findOne({ where: { appointmentId: appointment.id } })
  if (existing) {
    throw new AppError('Este turno ya tiene un registro de consulta', 409, 'consult_note_conflict')
  }

  if (appointment.status === 'cancelled') {
    throw new AppError('No se puede crear registro de consulta para turnos cancelados', 400, 'consult_note_cancelled_not_allowed')
  }

  const payload = buildConsultNotePayload({
    body: req.validated.body,
    appointment,
    actorId: req.auth.sub
  })

  let created
  await sequelize.transaction(async (transaction) => {
    created = await ConsultNote.create(payload, { transaction })
    await syncAppointmentStatusFromConsultNote({
      appointment,
      noteStatusFinal: payload.statusFinal,
      transaction
    })

    await writeAuditLog({
      actorRole: req.auth.role,
      actorId: req.auth.sub,
      action: 'CONSULT_NOTE_CREATED',
      entity: 'ConsultNote',
      entityId: created.id,
      meta: {
        appointmentId: appointment.id,
        statusFinal: payload.statusFinal
      },
      transaction
    })
  })

  const refreshed = await loadConsultNoteWithRelations(appointment.id)
  ok(res, refreshed, 'consult_note_created', 201)
}

export const patchConsultNoteByAppointment = async (req, res) => {
  ensureConsultNoteRole(req.auth)

  const appointment = await loadAppointmentForConsultNote(req.validated.params.id)
  if (!appointment) {
    throw new AppError('Turno no encontrado', 404, 'appointment_not_found')
  }
  ensureAppointmentScope(req.auth, appointment)

  const consultNote = await ConsultNote.findOne({ where: { appointmentId: appointment.id } })
  if (!consultNote) {
    throw new AppError('Registro de consulta no encontrado para este turno', 404, 'consult_note_not_found')
  }

  if (!canEditConsultNote(req.auth, consultNote)) {
    throw new AppError(
      'Solo puedes editar este registro durante 24 horas o con rol clinica/admin',
      403,
      'consult_note_edit_window_expired'
    )
  }

  const patch = buildConsultNotePatch({
    body: req.validated.body,
    actorId: req.auth.sub
  })

  await sequelize.transaction(async (transaction) => {
    await consultNote.update(patch, { transaction })

    if (patch.statusFinal) {
      await syncAppointmentStatusFromConsultNote({
        appointment,
        noteStatusFinal: patch.statusFinal,
        transaction
      })
    }

    await writeAuditLog({
      actorRole: req.auth.role,
      actorId: req.auth.sub,
      action: 'CONSULT_NOTE_UPDATED',
      entity: 'ConsultNote',
      entityId: consultNote.id,
      meta: {
        appointmentId: appointment.id,
        fields: Object.keys(patch)
      },
      transaction
    })
  })

  const refreshed = await loadConsultNoteWithRelations(appointment.id)
  ok(res, refreshed, 'consult_note_updated')
}

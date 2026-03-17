import { Op } from 'sequelize'
import { sequelize } from '../db/models/index.js'
import { AppError } from '../utils/errors.js'
import { addMinutesToTime } from '../utils/time.js'
import { parsePagination, buildPagination } from '../utils/pagination.js'
import { createMockPaymentIntent } from './paymentService.js'
import {
  ensureDoctorAvailableAtSlot,
  ensureNoSlotConflict,
  releaseExpiredHolds
} from './appointmentService.js'
import { writeAuditLog } from '../utils/audit.js'
import {
  appointmentDefaultInclude,
  createAppointmentRecord,
  createPaymentRecord,
  findActiveInsuranceById,
  findAndCountAppointments,
  findOrCreatePatientByDni,
  findSpecialtyById
} from '../repositories/appointmentRepository.js'

const defaultDependencies = {
  sequelize,
  releaseExpiredHolds,
  ensureDoctorAvailableAtSlot,
  ensureNoSlotConflict,
  findOrCreatePatientByDni,
  findSpecialtyById,
  findActiveInsuranceById,
  createAppointmentRecord,
  createPaymentRecord,
  createMockPaymentIntent,
  writeAuditLog
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

const assertCanCreateAppointment = ({ actorRole }) => {
  if (!['patient', 'clinic', 'admin', 'doctor'].includes(actorRole)) {
    throw new AppError('Prohibido', 403, 'forbidden')
  }
}

const resolveAppointmentPricing = ({ specialty, insurance }) => {
  const baseAmount = Number(specialty.fee)
  const discountPercent = insurance ? Number(insurance.discountPercent) : 0
  const finalAmount = Math.max(0, Number((baseAmount - ((baseAmount * discountPercent) / 100)).toFixed(2)))

  return {
    baseAmount,
    discountPercent,
    finalAmount
  }
}

export const createAppointmentWithHold = async ({ payload, auth }, overrides = {}) => {
  const deps = {
    ...defaultDependencies,
    ...overrides
  }
  const slotMinutes = payload.slotMinutes ?? 30
  const endTime = addMinutesToTime(payload.startTime, slotMinutes)
  const actorRole = auth.role
  const actorId = auth.sub

  assertCanCreateAppointment({ actorRole })

  const patientInput = normalizePatientPayload(payload)
  if (actorRole === 'patient' && auth.dni && auth.dni !== patientInput.dni) {
    throw new AppError('El DNI no coincide con tu sesion', 403, 'dni_mismatch')
  }

  let appointment
  let payment
  let paymentIntent
  let pricing = null

  try {
    await deps.sequelize.transaction(async (transaction) => {
      await deps.releaseExpiredHolds(transaction)
      await deps.ensureDoctorAvailableAtSlot({
        doctorId: payload.doctorId,
        date: payload.date,
        startTime: payload.startTime,
        endTime,
        transaction
      })
      await deps.ensureNoSlotConflict({
        doctorId: payload.doctorId,
        date: payload.date,
        startTime: payload.startTime,
        transaction
      })

      const [patient] = await deps.findOrCreatePatientByDni({
        dni: patientInput.dni,
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

      const specialty = await deps.findSpecialtyById({
        specialtyId: payload.specialtyId,
        transaction
      })
      if (!specialty) {
        throw new AppError('Especialidad no encontrada', 404, 'specialty_not_found')
      }

      let insurance = null
      if (payload.insuranceId) {
        insurance = await deps.findActiveInsuranceById({
          insuranceId: payload.insuranceId,
          transaction
        })
        if (!insurance) {
          throw new AppError('Obra social no encontrada o inactiva', 404, 'insurance_not_found')
        }
      }

      pricing = resolveAppointmentPricing({ specialty, insurance })

      appointment = await deps.createAppointmentRecord({
        payload: {
          doctorId: payload.doctorId,
          specialtyId: payload.specialtyId,
          insuranceId: insurance?.id ?? null,
          patientId: patient.id,
          date: payload.date,
          startTime: payload.startTime,
          endTime,
          symptoms: payload.symptoms ?? null,
          status: 'hold'
        },
        transaction
      })

      payment = await deps.createPaymentRecord({
        payload: {
          appointmentId: appointment.id,
          provider: actorRole === 'patient' ? 'mercadopago' : 'mock',
          amount: pricing.finalAmount,
          currency: 'ARS',
          status: 'pending'
        },
        transaction
      })

      paymentIntent = deps.createMockPaymentIntent({
        appointmentId: appointment.id,
        amount: pricing.finalAmount
      })

      await deps.writeAuditLog({
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
          discountPercent: pricing.discountPercent
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

  return {
    appointment,
    payment,
    paymentIntent,
    pricing
  }
}

export const listPatientAppointments = async ({ patientId, query = {} }) => {
  const { page, pageSize, offset, limit } = parsePagination(query)
  const { rows, count } = await findAndCountAppointments({
    where: { patientId },
    include: appointmentDefaultInclude,
    order: [['date', 'DESC'], ['startTime', 'DESC']],
    offset,
    limit
  })

  return {
    rows,
    pagination: buildPagination({ page, pageSize, total: count })
  }
}

export const listScopedAppointments = async ({ auth, query = {} }) => {
  const { page, pageSize, offset, limit } = parsePagination(query)

  const where = {}
  if (auth.role === 'doctor') {
    where.doctorId = auth.doctorId
  }
  if (query.doctorId && auth.role !== 'doctor') where.doctorId = query.doctorId
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

  const include = appointmentDefaultInclude.map((entry) => {
    if (entry.as === 'patient' && Object.keys(patientWhere).length > 0) {
      return { ...entry, where: patientWhere }
    }
    return entry
  })

  const { rows, count } = await findAndCountAppointments({
    where,
    include,
    order: [['date', 'DESC'], ['startTime', 'DESC']],
    offset,
    limit
  })

  return {
    rows,
    pagination: buildPagination({ page, pageSize, total: count })
  }
}

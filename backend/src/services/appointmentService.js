import { Op } from 'sequelize'
import { config } from '../config/env.js'
import {
  Appointment,
  DoctorAvailability,
  DoctorBlock
} from '../db/models/index.js'
import {
  buildSlotsForRange,
  parseTimeToMinutes
} from '../utils/time.js'
import { AppError } from '../utils/errors.js'

const ACTIVE_SLOT_STATUSES = ['hold', 'confirmed']

const normalizeTimeValue = (value) => {
  if (!value) return ''
  const [hours = '00', minutes = '00'] = String(value).split(':')
  return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`
}

const rangesOverlap = (aStart, aEnd, bStart, bEnd) => {
  const a1 = parseTimeToMinutes(aStart)
  const a2 = parseTimeToMinutes(aEnd)
  const b1 = parseTimeToMinutes(bStart)
  const b2 = parseTimeToMinutes(bEnd)
  return a1 < b2 && b1 < a2
}

const rangeContains = (outerStart, outerEnd, innerStart, innerEnd) => {
  const o1 = parseTimeToMinutes(outerStart)
  const o2 = parseTimeToMinutes(outerEnd)
  const i1 = parseTimeToMinutes(innerStart)
  const i2 = parseTimeToMinutes(innerEnd)
  return i1 >= o1 && i2 <= o2
}

export const releaseExpiredHolds = async (transaction) => {
  const threshold = new Date(Date.now() - config.APPOINTMENT_HOLD_MINUTES * 60 * 1000)
  await Appointment.update(
    {
      status: 'cancelled',
      cancelReason: 'hold_expired'
    },
    {
      where: {
        status: 'hold',
        createdAt: {
          [Op.lt]: threshold
        }
      },
      transaction
    }
  )
}

export const ensureDoctorAvailableAtSlot = async ({
  doctorId,
  date,
  startTime,
  endTime,
  transaction
}) => {
  const normalizedStartTime = normalizeTimeValue(startTime)
  const normalizedEndTime = normalizeTimeValue(endTime)
  const dayOfWeek = new Date(`${date}T00:00:00`).getDay()
  const availability = await DoctorAvailability.findAll({
    where: {
      doctorId,
      dayOfWeek,
      isActive: true
    },
    transaction
  })

  const inAvailability = availability.some((item) =>
    rangeContains(item.startTime, item.endTime, normalizedStartTime, normalizedEndTime)
  )

  if (!inAvailability) {
    throw new AppError('Horario fuera de disponibilidad del medico', 400, 'slot_unavailable')
  }

  const blocks = await DoctorBlock.findAll({
    where: {
      doctorId,
      date
    },
    transaction
  })

  const isBlocked = blocks.some((block) =>
    rangesOverlap(normalizedStartTime, normalizedEndTime, block.startTime, block.endTime)
  )
  if (isBlocked) {
    throw new AppError('Horario bloqueado por administracion', 409, 'slot_blocked')
  }
}

export const ensureNoSlotConflict = async ({
  doctorId,
  date,
  startTime,
  excludeAppointmentId,
  transaction
}) => {
  const normalizedStartTime = normalizeTimeValue(startTime)
  const where = {
    doctorId,
    date,
    startTime: normalizedStartTime,
    status: {
      [Op.in]: ACTIVE_SLOT_STATUSES
    }
  }
  if (excludeAppointmentId) {
    where.id = {
      [Op.ne]: excludeAppointmentId
    }
  }

  const existing = await Appointment.findOne({
    where,
    lock: transaction ? transaction.LOCK.UPDATE : undefined,
    transaction
  })
  if (existing) {
    throw new AppError('Ese horario ya no esta disponible', 409, 'slot_conflict')
  }
}

export const getAvailableSlots = async ({ doctorId, date }) => {
  await releaseExpiredHolds()

  const dayOfWeek = new Date(`${date}T00:00:00`).getDay()
  const availability = await DoctorAvailability.findAll({
    where: {
      doctorId,
      dayOfWeek,
      isActive: true
    }
  })
  const blocks = await DoctorBlock.findAll({
    where: { doctorId, date }
  })
  const booked = await Appointment.findAll({
    where: {
      doctorId,
      date,
      status: {
        [Op.in]: ACTIVE_SLOT_STATUSES
      }
    }
  })

  const blockedRanges = blocks.map((item) => ({
    startTime: normalizeTimeValue(item.startTime),
    endTime: normalizeTimeValue(item.endTime)
  }))
  const takenStarts = new Set(booked.map((item) => normalizeTimeValue(item.startTime)))

  const slots = availability.flatMap((range) => buildSlotsForRange(range.startTime, range.endTime, range.slotMinutes))

  const today = new Date().toISOString().slice(0, 10)
  const nowMinutes = parseTimeToMinutes(new Date().toTimeString().slice(0, 5))

  const filtered = slots
    .filter((slot) => !takenStarts.has(slot.startTime))
    .filter((slot) => {
      return !blockedRanges.some((block) => rangesOverlap(slot.startTime, slot.endTime, block.startTime, block.endTime))
    })
    .filter((slot) => {
      if (date !== today) return true
      return parseTimeToMinutes(slot.startTime) >= nowMinutes
    })

  const uniqueByStart = new Map(filtered.map((slot) => [slot.startTime, slot]))
  return Array.from(uniqueByStart.values())
}

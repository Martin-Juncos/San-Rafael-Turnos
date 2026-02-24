import { z } from 'zod'
import { Appointment, Message } from '../db/models/index.js'
import { AppError } from '../utils/errors.js'
import { ok } from '../utils/response.js'
import { config } from '../config/env.js'

export const appointmentMessagesSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid()
  })
})

export const postMessageSchema = z.object({
  body: z.object({
    body: z.string().min(1).max(4000)
  }),
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid()
  })
})

const ensureMessagePermission = (auth, appointment) => {
  if (auth.role === 'admin' || auth.role === 'clinic') return
  if (auth.role === 'doctor' && auth.doctorId === appointment.doctorId) return
  if (auth.role === 'patient' && auth.patientId === appointment.patientId) return
  throw new AppError('Prohibido', 403, 'forbidden')
}

const ensureMessagingWindow = (appointment) => {
  if (appointment.status !== 'confirmed') {
    throw new AppError('La mensajeria solo esta habilitada para turnos confirmados', 400, 'messaging_not_available')
  }

  const appointmentAt = new Date(`${appointment.date}T${appointment.startTime}`)
  const diffHours = (Date.now() - appointmentAt.getTime()) / (1000 * 60 * 60)
  if (diffHours > config.PATIENT_MESSAGE_WINDOW_HOURS) {
    throw new AppError('Ventana de mensajeria expirada', 400, 'messaging_window_expired')
  }
}

const senderRoleFromAuth = (role) => {
  if (role === 'doctor') return 'doctor'
  if (role === 'patient') return 'patient'
  return 'clinic'
}

export const getMessagesByAppointment = async (req, res) => {
  const appointment = await Appointment.findByPk(req.validated.params.id)
  if (!appointment) {
    throw new AppError('Turno no encontrado', 404, 'appointment_not_found')
  }
  ensureMessagePermission(req.auth, appointment)
  ensureMessagingWindow(appointment)

  const messages = await Message.findAll({
    where: { appointmentId: appointment.id },
    order: [['createdAt', 'ASC']]
  })
  ok(res, messages)
}

export const postMessageByAppointment = async (req, res) => {
  const appointment = await Appointment.findByPk(req.validated.params.id)
  if (!appointment) {
    throw new AppError('Turno no encontrado', 404, 'appointment_not_found')
  }
  ensureMessagePermission(req.auth, appointment)
  ensureMessagingWindow(appointment)

  const message = await Message.create({
    appointmentId: appointment.id,
    senderRole: senderRoleFromAuth(req.auth.role),
    senderId: req.auth.sub,
    body: req.validated.body.body
  })
  ok(res, message, 'message_created', 201)
}

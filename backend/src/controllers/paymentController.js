import { z } from 'zod'
import { Appointment, Payment, Doctor, Patient, sequelize } from '../db/models/index.js'
import { AppError } from '../utils/errors.js'
import { ok } from '../utils/response.js'
import { writeAuditLog } from '../utils/audit.js'
import {
  sendWhatsAppMessage,
  buildAppointmentConfirmationMessage
} from '../services/notificationService.js'

export const confirmMockPaymentSchema = z.object({
  body: z.object({
    appointmentId: z.string().uuid()
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional()
})

export const paymentByAppointmentSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({
    appointmentId: z.string().uuid()
  })
})

const ensurePaymentReadPermission = (auth, appointment) => {
  if (auth.role === 'admin' || auth.role === 'clinic') return
  if (auth.role === 'doctor' && auth.doctorId === appointment.doctorId) return
  if (auth.role === 'patient' && auth.patientId === appointment.patientId) return
  throw new AppError('Prohibido', 403, 'forbidden')
}

export const confirmMockPayment = async (req, res) => {
  if (req.auth.role !== 'patient') {
    throw new AppError('Prohibido', 403, 'forbidden')
  }

  const appointment = await Appointment.findByPk(req.validated.body.appointmentId, {
    include: [
      { model: Payment, as: 'payment' },
      { model: Doctor, as: 'doctor' },
      { model: Patient, as: 'patient' }
    ]
  })
  if (!appointment || !appointment.payment) {
    throw new AppError('Pago no encontrado', 404, 'payment_not_found')
  }
  ensurePaymentReadPermission(req.auth, appointment)

  if (appointment.payment.status !== 'pending') {
    throw new AppError('El pago ya fue procesado', 400, 'payment_already_processed')
  }

  await sequelize.transaction(async (transaction) => {
    await appointment.payment.update(
      {
        status: 'paid',
        paidAt: new Date(),
        externalRef: `mock_${appointment.id}`
      },
      { transaction }
    )
    await appointment.update(
      {
        status: 'confirmed'
      },
      { transaction }
    )
    await writeAuditLog({
      actorRole: req.auth.role,
      actorId: req.auth.sub,
      action: 'PAYMENT_CONFIRMED',
      entity: 'Payment',
      entityId: appointment.payment.id,
      meta: { appointmentId: appointment.id },
      transaction
    })
  })

  const message = buildAppointmentConfirmationMessage({
    patientName: appointment.patient.fullName,
    doctorName: appointment.doctor.fullName,
    date: appointment.date,
    time: appointment.startTime.slice(0, 5)
  })
  await sendWhatsAppMessage({
    to: appointment.patient.phone,
    body: message,
    templateName: 'appointment-confirmation'
  })

  const refreshed = await Payment.findByPk(appointment.payment.id)
  ok(res, refreshed, 'payment_confirmed')
}

export const getPaymentByAppointment = async (req, res) => {
  const appointment = await Appointment.findByPk(req.validated.params.appointmentId, {
    include: [{ model: Payment, as: 'payment' }]
  })
  if (!appointment || !appointment.payment) {
    throw new AppError('Pago no encontrado', 404, 'payment_not_found')
  }
  ensurePaymentReadPermission(req.auth, appointment)
  ok(res, appointment.payment)
}

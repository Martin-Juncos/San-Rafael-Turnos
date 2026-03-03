import { config } from '../config/env.js'
import { Appointment, Payment, PaymentWebhookEvent, Doctor, Patient, sequelize } from '../db/models/index.js'
import {
  createMercadoPagoPreference,
  getMercadoPagoPaymentById
} from './mercadoPagoService.js'
import { writeAuditLog } from '../utils/audit.js'
import {
  sendWhatsAppMessage,
  buildAppointmentConfirmationMessage
} from './notificationService.js'

const appointmentWithPaymentInclude = [
  { model: Payment, as: 'payment' },
  { model: Doctor, as: 'doctor' },
  { model: Patient, as: 'patient' }
]

const mapMercadoPagoStatusToLocal = (status) => {
  if (['approved', 'authorized'].includes(status)) return 'paid'
  if (['refunded', 'charged_back'].includes(status)) return 'refunded'
  if (['rejected', 'cancelled'].includes(status)) return 'failed'
  return 'pending'
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const extractCorrelation = (paymentPayload) => {
  const externalReference = String(paymentPayload.external_reference ?? '')
  const metadata = paymentPayload.metadata ?? {}
  const normalizedExternalReference = externalReference.trim()
  const appointmentIdFromExternalReference = UUID_REGEX.test(normalizedExternalReference)
    ? normalizedExternalReference
    : null

  return {
    appointmentId: metadata.appointmentId || appointmentIdFromExternalReference || null,
    paymentId: metadata.localPaymentId || metadata.paymentId || null
  }
}

const loadAppointmentByCorrelation = async ({ appointmentId, paymentId }) => {
  if (paymentId) {
    const localPayment = await Payment.findByPk(paymentId)
    if (localPayment) {
      return Appointment.findByPk(localPayment.appointmentId, {
        include: appointmentWithPaymentInclude
      })
    }
  }
  if (appointmentId) {
    return Appointment.findByPk(appointmentId, {
      include: appointmentWithPaymentInclude
    })
  }
  return null
}

export const buildMercadoPagoBackUrls = (appointmentId) => {
  const base = config.FRONTEND_PUBLIC_URL.replace(/\/$/, '')
  return {
    success: `${base}/reservar?appointmentId=${appointmentId}&mp_status=success`,
    failure: `${base}/reservar?appointmentId=${appointmentId}&mp_status=failure`,
    pending: `${base}/reservar?appointmentId=${appointmentId}&mp_status=pending`
  }
}

export const createAppointmentMercadoPagoPreference = async ({ appointment }) => {
  const payload = {
    items: [
      {
        id: appointment.id,
        title: `Consulta medica - ${appointment.doctor.fullName}`,
        quantity: 1,
        currency_id: appointment.payment.currency || config.PAYMENT_DEFAULT_CURRENCY,
        unit_price: Number(appointment.payment.amount)
      }
    ],
    external_reference: appointment.id,
    metadata: {
      appointmentId: appointment.id,
      localPaymentId: appointment.payment.id,
      patientId: appointment.patientId
    },
    auto_return: 'approved',
    back_urls: buildMercadoPagoBackUrls(appointment.id)
  }

  if (config.MERCADOPAGO_WEBHOOK_URL) {
    payload.notification_url = config.MERCADOPAGO_WEBHOOK_URL
  }

  return createMercadoPagoPreference(payload)
}

export const reconcileMercadoPagoPayment = async ({
  mercadoPagoPaymentId,
  webhookContext = null,
  actorRole = 'system',
  actorId = null
}) => {
  const mpPayment = await getMercadoPagoPaymentById(mercadoPagoPaymentId)
  const correlation = extractCorrelation(mpPayment)
  const appointment = await loadAppointmentByCorrelation(correlation)

  if (!appointment || !appointment.payment) {
    return null
  }

  const nextStatus = mapMercadoPagoStatusToLocal(mpPayment.status)
  const providerPaymentId = String(mpPayment.id)
  const preferenceId = String(mpPayment.preference_id || '')
  let becamePaid = false
  let idempotentHit = false

  await sequelize.transaction(async (transaction) => {
    const lockedAppointment = await Appointment.findByPk(appointment.id, {
      include: [{ model: Payment, as: 'payment' }],
      transaction,
      lock: transaction.LOCK.UPDATE
    })

    if (!lockedAppointment?.payment) return

    const lockedPayment = lockedAppointment.payment

    if (webhookContext) {
      try {
        await PaymentWebhookEvent.create(
          {
            paymentId: lockedPayment.id,
            provider: 'mercadopago',
            providerPaymentId,
            providerStatus: String(mpPayment.status || ''),
            preferenceId: preferenceId || null,
            externalReference: String(mpPayment.external_reference || '') || null,
            webhookEventId: webhookContext.webhookEventId || null,
            webhookTopic: webhookContext.topic || null,
            webhookAction: webhookContext.action || null,
            payload: webhookContext.payload
          },
          { transaction }
        )
      } catch (error) {
        if (error?.name === 'SequelizeUniqueConstraintError') {
          idempotentHit = true
          return
        }
        throw error
      }
    }

    if (lockedPayment.providerPaymentId === providerPaymentId && lockedPayment.status === nextStatus) {
      idempotentHit = true
      return
    }

    becamePaid = lockedPayment.status !== 'paid' && nextStatus === 'paid'

    await lockedPayment.update(
      {
        provider: 'mercadopago',
        externalRef: providerPaymentId,
        preferenceId: preferenceId || lockedPayment.preferenceId,
        providerPaymentId,
        providerStatus: String(mpPayment.status || ''),
        lastWebhookPayload: webhookContext?.payload ?? lockedPayment.lastWebhookPayload,
        status: nextStatus,
        paidAt: nextStatus === 'paid'
          ? new Date(mpPayment.date_approved || Date.now())
          : lockedPayment.paidAt
      },
      { transaction }
    )

    if (becamePaid && lockedAppointment.status !== 'confirmed') {
      await lockedAppointment.update(
        {
          status: 'confirmed'
        },
        { transaction }
      )
    }

    await writeAuditLog({
      actorRole,
      actorId,
      action: 'PAYMENT_MERCADOPAGO_RECONCILED',
      entity: 'Payment',
      entityId: lockedPayment.id,
      meta: {
        appointmentId: lockedAppointment.id,
        mercadoPagoPaymentId: providerPaymentId,
        mercadoPagoStatus: mpPayment.status,
        localStatus: nextStatus,
        idempotentHit
      },
      transaction
    })
  })

  if (idempotentHit) {
    const refreshedIdempotent = await Appointment.findByPk(appointment.id, {
      include: appointmentWithPaymentInclude
    })

    return {
      appointment: refreshedIdempotent,
      payment: refreshedIdempotent?.payment || null,
      mercadoPagoStatus: mpPayment.status,
      idempotent: true
    }
  }

  if (becamePaid) {
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
  }

  const refreshed = await Appointment.findByPk(appointment.id, {
    include: appointmentWithPaymentInclude
  })

  return {
    appointment: refreshed,
    payment: refreshed.payment,
    mercadoPagoStatus: mpPayment.status
  }
}

import { z } from 'zod'
import { config } from '../config/env.js'
import { logger } from '../config/logger.js'
import { Appointment, Payment, Doctor, Patient, sequelize } from '../db/models/index.js'
import { AppError } from '../utils/errors.js'
import { ok } from '../utils/response.js'
import { writeAuditLog } from '../utils/audit.js'
import {
  sendWhatsAppMessage,
  buildAppointmentConfirmationMessage
} from '../services/notificationService.js'
import {
  createMercadoPagoPreference,
  getMercadoPagoPaymentById,
  verifyMercadoPagoWebhookSignature
} from '../services/mercadoPagoService.js'

const appointmentWithPaymentInclude = [
  { model: Payment, as: 'payment' },
  { model: Doctor, as: 'doctor' },
  { model: Patient, as: 'patient' }
]

export const confirmMockPaymentSchema = z.object({
  body: z.object({
    appointmentId: z.string().uuid()
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional()
})

export const createMercadoPagoPreferenceSchema = z.object({
  body: z.object({
    appointmentId: z.string().uuid()
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional()
})

export const syncMercadoPagoPaymentSchema = z.object({
  body: z.object({
    paymentId: z.coerce.string().min(1)
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

export const updatePaymentStatusSchema = z.object({
  body: z.object({
    status: z.enum(['pending', 'paid', 'failed', 'refunded'])
  }),
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

const mapMercadoPagoStatusToLocal = (status) => {
  if (['approved', 'authorized'].includes(status)) return 'paid'
  if (['refunded', 'charged_back'].includes(status)) return 'refunded'
  if (['rejected', 'cancelled'].includes(status)) return 'failed'
  return 'pending'
}

const extractCorrelation = (paymentPayload) => {
  const externalReference = String(paymentPayload.external_reference ?? '')
  const metadata = paymentPayload.metadata ?? {}
  const matches = externalReference.match(/appointment:([0-9a-f-]+):payment:([0-9a-f-]+)/i)

  return {
    appointmentId: metadata.appointmentId || matches?.[1] || null,
    paymentId: metadata.paymentId || matches?.[2] || null
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

const buildMercadoPagoBackUrls = (appointmentId) => {
  const base = config.FRONTEND_PUBLIC_URL.replace(/\/$/, '')
  return {
    success: `${base}/reservar?appointmentId=${appointmentId}&mp_status=success`,
    failure: `${base}/reservar?appointmentId=${appointmentId}&mp_status=failure`,
    pending: `${base}/reservar?appointmentId=${appointmentId}&mp_status=pending`
  }
}

const reconcileMercadoPagoPayment = async ({
  mercadoPagoPaymentId,
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
  const becamePaid = appointment.payment.status !== 'paid' && nextStatus === 'paid'

  await sequelize.transaction(async (transaction) => {
    await appointment.payment.update(
      {
        provider: 'mercadopago',
        externalRef: String(mpPayment.id),
        status: nextStatus,
        paidAt: nextStatus === 'paid'
          ? new Date(mpPayment.date_approved || Date.now())
          : appointment.payment.paidAt
      },
      { transaction }
    )

    if (becamePaid && appointment.status !== 'confirmed') {
      await appointment.update(
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
      entityId: appointment.payment.id,
      meta: {
        appointmentId: appointment.id,
        mercadoPagoPaymentId: String(mpPayment.id),
        mercadoPagoStatus: mpPayment.status,
        localStatus: nextStatus
      },
      transaction
    })
  })

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

export const confirmMockPayment = async (req, res) => {
  if (req.auth.role !== 'patient') {
    throw new AppError('Prohibido', 403, 'forbidden')
  }

  const appointment = await Appointment.findByPk(req.validated.body.appointmentId, {
    include: appointmentWithPaymentInclude
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
      meta: { appointmentId: appointment.id, provider: 'mock' },
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

export const createMercadoPagoPreferenceForAppointment = async (req, res) => {
  if (req.auth.role !== 'patient') {
    throw new AppError('Prohibido', 403, 'forbidden')
  }

  const appointment = await Appointment.findByPk(req.validated.body.appointmentId, {
    include: appointmentWithPaymentInclude
  })
  if (!appointment || !appointment.payment) {
    throw new AppError('Pago no encontrado', 404, 'payment_not_found')
  }
  ensurePaymentReadPermission(req.auth, appointment)

  if (appointment.payment.status !== 'pending') {
    throw new AppError('El pago ya fue procesado', 400, 'payment_already_processed')
  }

  const externalReference = `appointment:${appointment.id}:payment:${appointment.payment.id}`
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
    external_reference: externalReference,
    metadata: {
      appointmentId: appointment.id,
      paymentId: appointment.payment.id,
      patientId: appointment.patientId
    },
    auto_return: 'approved',
    back_urls: buildMercadoPagoBackUrls(appointment.id)
  }

  if (config.MERCADOPAGO_WEBHOOK_URL) {
    payload.notification_url = config.MERCADOPAGO_WEBHOOK_URL
  }

  const preference = await createMercadoPagoPreference(payload)

  await appointment.payment.update({
    provider: 'mercadopago',
    externalRef: `preference_${preference.id}`
  })

  logger.info(
    {
      requestId: req.requestId,
      actorRole: req.auth.role,
      actorId: req.auth.sub,
      appointmentId: appointment.id,
      localPaymentId: appointment.payment.id,
      preferenceId: preference.id
    },
    'mercadopago-preference-created'
  )

  await writeAuditLog({
    actorRole: req.auth.role,
    actorId: req.auth.sub,
    action: 'PAYMENT_MERCADOPAGO_PREFERENCE_CREATED',
    entity: 'Payment',
    entityId: appointment.payment.id,
    meta: {
      appointmentId: appointment.id,
      preferenceId: preference.id
    }
  })

  ok(
    res,
    {
      appointmentId: appointment.id,
      preferenceId: preference.id,
      initPoint: preference.sandbox_init_point || preference.init_point,
      sandboxInitPoint: preference.sandbox_init_point || null
    },
    'mercadopago_preference_created'
  )
}

export const syncMercadoPagoPayment = async (req, res) => {
  if (req.auth.role !== 'patient') {
    throw new AppError('Prohibido', 403, 'forbidden')
  }

  const reconciled = await reconcileMercadoPagoPayment({
    mercadoPagoPaymentId: req.validated.body.paymentId,
    actorRole: req.auth.role,
    actorId: req.auth.sub
  })

  if (!reconciled) {
    throw new AppError('Pago no encontrado o sin correlacion local', 404, 'payment_not_found')
  }

  ensurePaymentReadPermission(req.auth, reconciled.appointment)

  ok(
    res,
    {
      payment: reconciled.payment,
      appointmentStatus: reconciled.appointment.status,
      appointmentId: reconciled.appointment.id,
      mercadoPagoStatus: reconciled.mercadoPagoStatus
    },
    'mercadopago_payment_synced'
  )
}

const resolveWebhookPaymentId = (req) => {
  return req.body?.data?.id ||
    req.body?.id ||
    req.query['data.id'] ||
    req.query.id ||
    null
}

export const mercadoPagoWebhook = async (req, res) => {
  const paymentId = resolveWebhookPaymentId(req)
  const topic = String(req.body?.topic || req.query.topic || req.body?.type || '')
  const action = String(req.body?.action || req.query.action || '')
  const webhookEventId = req.body?.id || req.query.id || null
  const signature = req.headers['x-signature']
  const requestId = req.headers['x-request-id']

  logger.info(
    {
      requestId: req.requestId,
      webhookRequestId: Array.isArray(requestId) ? requestId[0] : requestId,
      webhookEventId: webhookEventId ? String(webhookEventId) : null,
      topic,
      action,
      paymentId: paymentId ? String(paymentId) : null
    },
    'mercadopago-webhook-received'
  )

  if (!paymentId) {
    logger.warn(
      {
        requestId: req.requestId,
        webhookEventId: webhookEventId ? String(webhookEventId) : null,
        topic,
        action
      },
      'mercadopago-webhook-ignored-missing-payment-id'
    )
    ok(res, { received: true, ignored: 'missing_payment_id' }, 'mercadopago_webhook_ignored')
    return
  }

  const isValidSignature = verifyMercadoPagoWebhookSignature({
    signature: Array.isArray(signature) ? signature[0] : signature,
    requestId: Array.isArray(requestId) ? requestId[0] : requestId,
    dataId: paymentId
  })

  if (!isValidSignature) {
    logger.warn(
      {
        requestId: req.requestId,
        webhookEventId: webhookEventId ? String(webhookEventId) : null,
        topic,
        action,
        paymentId: String(paymentId)
      },
      'mercadopago-webhook-invalid-signature'
    )
    ok(res, { received: true, ignored: 'invalid_signature' }, 'mercadopago_webhook_ignored')
    return
  }

  ok(res, { received: true, accepted: true }, 'mercadopago_webhook_received')

  Promise.resolve()
    .then(() => reconcileMercadoPagoPayment({
      mercadoPagoPaymentId: String(paymentId)
    }))
    .then((reconciled) => {
      logger.info(
        {
          requestId: req.requestId,
          webhookEventId: webhookEventId ? String(webhookEventId) : null,
          topic,
          action,
          paymentId: String(paymentId),
          reconciled: Boolean(reconciled)
        },
        'mercadopago-webhook-reconciled'
      )
    })
    .catch((error) => {
      logger.error(
        {
          requestId: req.requestId,
          webhookEventId: webhookEventId ? String(webhookEventId) : null,
          topic,
          action,
          err: error,
          paymentId: String(paymentId)
        },
        'mercadopago-webhook-reconcile-failed'
      )
    })
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

export const updatePaymentStatusByAppointment = async (req, res) => {
  if (!['admin', 'clinic', 'doctor'].includes(req.auth.role)) {
    throw new AppError('Prohibido', 403, 'forbidden')
  }

  const appointment = await Appointment.findByPk(req.validated.params.appointmentId, {
    include: [{ model: Payment, as: 'payment' }]
  })

  if (!appointment || !appointment.payment) {
    throw new AppError('Pago no encontrado', 404, 'payment_not_found')
  }

  ensurePaymentReadPermission(req.auth, appointment)

  const previousStatus = appointment.payment.status
  const nextStatus = req.validated.body.status

  if (previousStatus === nextStatus) {
    ok(
      res,
      {
        payment: appointment.payment,
        appointmentStatus: appointment.status
      },
      'payment_status_unchanged'
    )
    return
  }

  await sequelize.transaction(async (transaction) => {
    const paymentPatch = {
      status: nextStatus
    }

    if (nextStatus === 'paid') {
      paymentPatch.paidAt = new Date()
      paymentPatch.externalRef = appointment.payment.externalRef || `manual_${appointment.id}`
    } else if (nextStatus === 'pending' || nextStatus === 'failed') {
      paymentPatch.paidAt = null
    }

    await appointment.payment.update(paymentPatch, { transaction })

    if (nextStatus === 'paid' && ['requested', 'hold', 'rescheduled'].includes(appointment.status)) {
      await appointment.update(
        {
          status: 'confirmed'
        },
        { transaction }
      )
    }

    await writeAuditLog({
      actorRole: req.auth.role,
      actorId: req.auth.sub,
      action: 'PAYMENT_STATUS_PATCHED',
      entity: 'Payment',
      entityId: appointment.payment.id,
      meta: {
        appointmentId: appointment.id,
        previousStatus,
        nextStatus
      },
      transaction
    })
  })

  const refreshedAppointment = await Appointment.findByPk(appointment.id, {
    include: [{ model: Payment, as: 'payment' }]
  })

  ok(
    res,
    {
      payment: refreshedAppointment.payment,
      appointmentStatus: refreshedAppointment.status
    },
    'payment_status_updated'
  )
}

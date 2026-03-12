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
  getMercadoPagoPaymentById
} from '../services/mercadoPagoService.js'
import {
  assertMercadoPagoPaymentMatchesAppointment,
  processMercadoPagoWebhookPayment,
  syncMercadoPagoPaymentLocally
} from '../services/mercadoPagoReconciliationService.js'
import { validateMercadoPagoWebhookSignature } from '../services/mercadoPagoWebhookSecurityService.js'

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
    appointmentId: z.string().uuid(),
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

const isLocalFrontendOrigin = (origin) => {
  try {
    const url = new URL(origin)
    return ['localhost', '127.0.0.1', '::1'].includes(url.hostname)
  } catch {
    return false
  }
}

const buildMercadoPagoPreferenceRedirectConfig = (appointmentId, requestedOrigin = '') => {
  const baseUrl = String(requestedOrigin || config.FRONTEND_PUBLIC_URL || 'http://localhost:5173').replace(/\/+$/, '')
  if (!baseUrl || isLocalFrontendOrigin(baseUrl)) {
    return {}
  }

  return {
    back_urls: {
      success: `${baseUrl}/reservar?appointmentId=${appointmentId}&mp_status=success`,
      failure: `${baseUrl}/reservar?appointmentId=${appointmentId}&mp_status=failure`,
      pending: `${baseUrl}/reservar?appointmentId=${appointmentId}&mp_status=pending`
    },
    auto_return: 'approved'
  }
}

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
  if (!config.MERCADOPAGO_ACCESS_TOKEN) {
    throw new AppError(
      'Mercado Pago no esta configurado. Falta MERCADOPAGO_ACCESS_TOKEN en backend/.env',
      400,
      'mercadopago_not_configured'
    )
  }

  const appointment = await Appointment.findByPk(req.validated.body.appointmentId, {
    include: appointmentWithPaymentInclude
  })
  if (!appointment || !appointment.payment) {
    throw new AppError('Pago no encontrado', 404, 'payment_not_found')
  }
  ensurePaymentReadPermission(req.auth, appointment)

  if (appointment.payment.status === 'paid') {
    throw new AppError('El pago ya fue procesado', 400, 'payment_already_processed')
  }

  const notificationUrl = String(config.MERCADOPAGO_WEBHOOK_URL || '').trim()

  const preference = await createMercadoPagoPreference({
    items: [
      {
        title: `Consulta medica - ${appointment.doctor.fullName}`,
        quantity: 1,
        unit_price: Number(appointment.payment.amount),
        currency_id: appointment.payment.currency || config.PAYMENT_DEFAULT_CURRENCY
      }
    ],
    ...buildMercadoPagoPreferenceRedirectConfig(appointment.id, req.get('origin') || ''),
    external_reference: appointment.id,
    metadata: {
      appointmentId: appointment.id,
      localPaymentId: appointment.payment.id,
      patientId: appointment.patientId
    },
    ...(notificationUrl ? { notification_url: notificationUrl } : {})
  })

  await appointment.payment.update({
    provider: 'mercadopago',
    status: 'pending',
    paidAt: null,
    externalRef: `preference_${preference.id}`,
    preferenceId: preference.id,
    providerPaymentId: null,
    providerStatus: null
  })

  logger.info(
    {
      requestId: req.requestId,
      actorRole: req.auth.role,
      actorId: req.auth.sub,
      appointmentId: appointment.id,
      localPaymentId: appointment.payment.id,
      preferenceId: preference.id,
      paymentAmount: Number(appointment.payment.amount),
      paymentCurrency: appointment.payment.currency,
      notificationUrlConfigured: Boolean(notificationUrl),
      redirectMode: notificationUrl ? 'webhook_and_back_urls' : 'back_urls_only'
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
      id: preference.id,
      preferenceId: preference.id
    },
    'mercadopago_preference_created'
  )
}

const extractMercadoPagoWebhookNotification = (req) => {
  const body = req.body || {}
  const query = req.query || {}
  const webhookTopic = String(body.type || body.topic || query.type || query.topic || '').trim().toLowerCase()
  const webhookAction = String(body.action || '').trim() || null
  const webhookEventId = String(body.id || '').trim() || null
  const providerPaymentId = String(
    body.data?.id ||
    body.resource ||
    query['data.id'] ||
    query.id ||
    ''
  ).trim()

  return {
    webhookTopic,
    webhookAction,
    webhookEventId,
    providerPaymentId,
    payload: body
  }
}

export const receiveMercadoPagoWebhook = async (req, res) => {
  const notification = extractMercadoPagoWebhookNotification(req)
  const signatureValidation = validateMercadoPagoWebhookSignature(req)

  logger.info(
    {
      requestId: req.requestId,
      webhookTopic: notification.webhookTopic || null,
      webhookAction: notification.webhookAction || null,
      webhookEventId: notification.webhookEventId || null,
      providerPaymentId: notification.providerPaymentId || null,
      signatureValidationEnabled: signatureValidation.enabled,
      signatureValidationReason: signatureValidation.reason || null
    },
    'mercadopago-webhook-received'
  )

  ok(res, { received: true }, 'mercadopago_webhook_received')

  if (!notification.providerPaymentId || (notification.webhookTopic && notification.webhookTopic !== 'payment')) {
    logger.info(
      {
        requestId: req.requestId,
        webhookTopic: notification.webhookTopic || null,
        providerPaymentId: notification.providerPaymentId || null,
        signatureValidationEnabled: signatureValidation.enabled
      },
      'mercadopago-webhook-ignored'
    )
    return
  }

  Promise.resolve()
    .then(async () => {
      const mpPayment = await getMercadoPagoPaymentById(notification.providerPaymentId)
      const result = await processMercadoPagoWebhookPayment({
        mpPayment,
        webhookNotification: notification
      })

      logger.info(
        {
          requestId: req.requestId,
          providerPaymentId: notification.providerPaymentId,
          webhookEventId: notification.webhookEventId,
          webhookTopic: notification.webhookTopic,
          matched: result.matched,
          appointmentId: result.appointmentId || null,
          paymentStatus: result.paymentStatus || null,
          providerStatus: result.providerStatus || null
        },
        'mercadopago-webhook-processed'
      )
    })
    .catch((error) => {
      logger.error(
        {
          requestId: req.requestId,
          providerPaymentId: notification.providerPaymentId,
          webhookEventId: notification.webhookEventId,
          err: error
        },
        'mercadopago-webhook-processing-failed'
      )
    })
}

export const syncMercadoPagoPayment = async (req, res) => {
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

  const providerPaymentId = String(req.validated.body.paymentId)
  const mpPayment = await getMercadoPagoPaymentById(providerPaymentId)
  assertMercadoPagoPaymentMatchesAppointment({ appointment, mpPayment })

  const refreshedAppointment = await syncMercadoPagoPaymentLocally({
    appointmentId: appointment.id,
    mpPayment,
    actorRole: req.auth.role,
    actorId: req.auth.sub
  })

  logger.info(
    {
      requestId: req.requestId,
      actorRole: req.auth.role,
      actorId: req.auth.sub,
      appointmentId: refreshedAppointment.id,
      localPaymentId: refreshedAppointment.payment?.id || null,
      providerPaymentId,
      providerStatus: refreshedAppointment.payment?.providerStatus || null,
      paymentStatus: refreshedAppointment.payment?.status || null,
      appointmentStatus: refreshedAppointment.status
    },
    'mercadopago-payment-sync-request-processed'
  )

  ok(
    res,
    {
      payment: refreshedAppointment.payment,
      appointmentStatus: refreshedAppointment.status,
      appointmentId: refreshedAppointment.id,
      mercadoPagoStatus: refreshedAppointment.payment.providerStatus || null,
      synchronized: true
    },
    'mercadopago_payment_synced'
  )
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

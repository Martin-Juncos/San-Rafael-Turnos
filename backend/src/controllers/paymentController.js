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

const mapMercadoPagoStatusToLocal = (status) => {
  if (['approved', 'authorized'].includes(status)) return 'paid'
  if (['refunded', 'charged_back'].includes(status)) return 'refunded'
  if (['rejected', 'cancelled'].includes(status)) return 'failed'
  return 'pending'
}

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

const assertMercadoPagoPaymentMatchesAppointment = ({ appointment, mpPayment }) => {
  const externalReference = String(mpPayment?.external_reference || '').trim()
  const metadata = mpPayment?.metadata || {}
  const metadataAppointmentId = String(metadata.appointmentId || '').trim()
  const metadataLocalPaymentId = String(metadata.localPaymentId || metadata.paymentId || '').trim()

  if (externalReference && externalReference !== appointment.id) {
    throw new AppError('El pago no corresponde al turno indicado', 403, 'mercadopago_payment_mismatch')
  }
  if (metadataAppointmentId && metadataAppointmentId !== appointment.id) {
    throw new AppError('El pago no corresponde al turno indicado', 403, 'mercadopago_payment_mismatch')
  }
  if (metadataLocalPaymentId && metadataLocalPaymentId !== appointment.payment.id) {
    throw new AppError('El pago no corresponde al registro local esperado', 403, 'mercadopago_payment_mismatch')
  }
}

const queueAppointmentConfirmationMessage = (appointment, requestId = null) => {
  if (!appointment?.patient?.phone || !appointment?.patient?.fullName || !appointment?.doctor?.fullName) {
    return
  }

  const message = buildAppointmentConfirmationMessage({
    patientName: appointment.patient.fullName,
    doctorName: appointment.doctor.fullName,
    date: appointment.date,
    time: appointment.startTime.slice(0, 5)
  })

  Promise.resolve()
    .then(() => sendWhatsAppMessage({
      to: appointment.patient.phone,
      body: message,
      templateName: 'appointment-confirmation'
    }))
    .catch((error) => {
      logger.warn(
        {
          requestId,
          appointmentId: appointment.id,
          err: error
        },
        'mercadopago-confirmation-message-failed'
      )
    })
}

const syncMercadoPagoPaymentLocally = async ({
  appointmentId,
  mpPayment,
  actorRole,
  actorId
}) => {
  const nextStatus = mapMercadoPagoStatusToLocal(mpPayment.status)
  const providerPaymentId = String(mpPayment.id || '')
  const providerStatus = String(mpPayment.status || '')
  const preferenceId = String(mpPayment.preference_id || '')

  let becamePaid = false

  await sequelize.transaction(async (transaction) => {
    const lockedAppointment = await Appointment.findByPk(appointmentId, {
      include: appointmentWithPaymentInclude,
      transaction,
      lock: transaction.LOCK.UPDATE
    })

    if (!lockedAppointment || !lockedAppointment.payment) {
      throw new AppError('Pago no encontrado', 404, 'payment_not_found')
    }

    becamePaid = lockedAppointment.payment.status !== 'paid' && nextStatus === 'paid'

    await lockedAppointment.payment.update(
      {
        provider: 'mercadopago',
        status: nextStatus,
        externalRef: providerPaymentId || lockedAppointment.payment.externalRef,
        preferenceId: preferenceId || lockedAppointment.payment.preferenceId,
        providerPaymentId: providerPaymentId || lockedAppointment.payment.providerPaymentId,
        providerStatus,
        paidAt: nextStatus === 'paid'
          ? new Date(mpPayment.date_approved || Date.now())
          : nextStatus === 'refunded'
            ? lockedAppointment.payment.paidAt
            : null
      },
      { transaction }
    )

    if (nextStatus === 'paid' && ['requested', 'hold', 'rescheduled'].includes(lockedAppointment.status)) {
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
      action: 'PAYMENT_MERCADOPAGO_SYNCED',
      entity: 'Payment',
      entityId: lockedAppointment.payment.id,
      meta: {
        appointmentId: lockedAppointment.id,
        providerPaymentId,
        providerStatus,
        nextStatus
      },
      transaction
    })
  })

  const refreshed = await Appointment.findByPk(appointmentId, {
    include: appointmentWithPaymentInclude
  })

  if (becamePaid) {
    queueAppointmentConfirmationMessage(refreshed)
  }

  return refreshed
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
    }
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
      id: preference.id,
      preferenceId: preference.id
    },
    'mercadopago_preference_created'
  )
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

import { UniqueConstraintError } from 'sequelize'
import { logger } from '../config/logger.js'
import {
  Appointment,
  Payment,
  PaymentWebhookEvent,
  Doctor,
  Patient,
  sequelize
} from '../db/models/index.js'
import { AppError } from '../utils/errors.js'
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

export const mapMercadoPagoStatusToLocal = (status) => {
  if (['approved', 'authorized'].includes(status)) return 'paid'
  if (['refunded', 'charged_back'].includes(status)) return 'refunded'
  if (['rejected', 'cancelled'].includes(status)) return 'failed'
  return 'pending'
}

export const assertMercadoPagoPaymentMatchesAppointment = ({ appointment, mpPayment }) => {
  const externalReference = String(mpPayment?.external_reference || '').trim()
  const metadata = mpPayment?.metadata || {}
  const metadataAppointmentId = String(metadata.appointmentId || metadata.appointment_id || '').trim()
  const metadataLocalPaymentId = String(
    metadata.localPaymentId ||
    metadata.local_payment_id ||
    metadata.paymentId ||
    metadata.payment_id ||
    ''
  ).trim()

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

const findAppointmentForMercadoPagoPayment = async (mpPayment, transaction) => {
  const metadata = mpPayment?.metadata || {}
  const localPaymentId = String(
    metadata.localPaymentId ||
    metadata.local_payment_id ||
    metadata.paymentId ||
    metadata.payment_id ||
    ''
  ).trim()
  const appointmentIdFromMetadata = String(metadata.appointmentId || metadata.appointment_id || '').trim()
  const providerPaymentId = String(mpPayment?.id || '').trim()
  const preferenceId = String(mpPayment?.preference_id || '').trim()
  const externalReference = String(mpPayment?.external_reference || '').trim()

  if (localPaymentId) {
    const payment = await Payment.findByPk(localPaymentId, {
      transaction
    })
    if (payment) {
      const appointment = await Appointment.findByPk(payment.appointmentId, {
        include: appointmentWithPaymentInclude,
        transaction
      })
      if (appointment?.payment) {
        return appointment
      }
    }
  }

  if (appointmentIdFromMetadata) {
    const appointment = await Appointment.findByPk(appointmentIdFromMetadata, {
      include: appointmentWithPaymentInclude,
      transaction
    })
    if (appointment?.payment) {
      return appointment
    }
  }

  if (providerPaymentId) {
    const payment = await Payment.findOne({
      where: { provider: 'mercadopago', providerPaymentId },
      transaction
    })
    if (payment) {
      const appointment = await Appointment.findByPk(payment.appointmentId, {
        include: appointmentWithPaymentInclude,
        transaction
      })
      if (appointment?.payment) {
        return appointment
      }
    }
  }

  if (preferenceId) {
    const payment = await Payment.findOne({
      where: { provider: 'mercadopago', preferenceId },
      transaction
    })
    if (payment) {
      const appointment = await Appointment.findByPk(payment.appointmentId, {
        include: appointmentWithPaymentInclude,
        transaction
      })
      if (appointment?.payment) {
        return appointment
      }
    }
  }

  if (externalReference) {
    const appointment = await Appointment.findByPk(externalReference, {
      include: appointmentWithPaymentInclude,
      transaction
    })
    if (appointment?.payment) {
      return appointment
    }
  }

  return null
}

const recordWebhookEvent = async ({
  paymentId,
  providerPaymentId,
  providerStatus,
  preferenceId,
  externalReference,
  webhookEventId,
  webhookTopic,
  webhookAction,
  payload,
  transaction
}) => {
  try {
    await PaymentWebhookEvent.create(
      {
        paymentId,
        provider: 'mercadopago',
        providerPaymentId,
        providerStatus,
        preferenceId: preferenceId || null,
        externalReference: externalReference || null,
        webhookEventId: webhookEventId || null,
        webhookTopic: webhookTopic || null,
        webhookAction: webhookAction || null,
        payload: payload || {}
      },
      { transaction }
    )
    return true
  } catch (error) {
    if (error instanceof UniqueConstraintError) {
      return false
    }
    throw error
  }
}

export const syncMercadoPagoPaymentLocally = async ({
  appointmentId,
  mpPayment,
  actorRole,
  actorId,
  webhookNotification = null
}) => {
  const nextStatus = mapMercadoPagoStatusToLocal(mpPayment.status)
  const providerPaymentId = String(mpPayment.id || '')
  const providerStatus = String(mpPayment.status || '')
  const preferenceId = String(mpPayment.preference_id || '')
  const externalReference = String(mpPayment.external_reference || '')
  const source = webhookNotification ? 'webhook' : 'manual'

  let becamePaid = false
  let webhookRecorded = true

  await sequelize.transaction(async (transaction) => {
    const lockedAppointment = await Appointment.findByPk(appointmentId, {
      transaction,
      lock: transaction.LOCK.UPDATE
    })

    if (!lockedAppointment) {
      throw new AppError('Pago no encontrado', 404, 'payment_not_found')
    }

    const lockedPayment = await Payment.findOne({
      where: { appointmentId },
      transaction,
      lock: transaction.LOCK.UPDATE
    })

    if (!lockedPayment) {
      throw new AppError('Pago no encontrado', 404, 'payment_not_found')
    }

    if (webhookNotification) {
      webhookRecorded = await recordWebhookEvent({
        paymentId: lockedPayment.id,
        providerPaymentId,
        providerStatus,
        preferenceId,
        externalReference,
        webhookEventId: webhookNotification.webhookEventId,
        webhookTopic: webhookNotification.webhookTopic,
        webhookAction: webhookNotification.webhookAction,
        payload: webhookNotification.payload,
        transaction
      })
    }

    becamePaid = lockedPayment.status !== 'paid' && nextStatus === 'paid'

    await lockedPayment.update(
      {
        provider: 'mercadopago',
        status: nextStatus,
        externalRef: providerPaymentId || lockedPayment.externalRef,
        preferenceId: preferenceId || lockedPayment.preferenceId,
        providerPaymentId: providerPaymentId || lockedPayment.providerPaymentId,
        providerStatus,
        lastWebhookPayload: webhookNotification?.payload || lockedPayment.lastWebhookPayload,
        paidAt: nextStatus === 'paid'
          ? new Date(mpPayment.date_approved || Date.now())
          : nextStatus === 'refunded'
            ? lockedPayment.paidAt
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

    if (webhookRecorded || !webhookNotification) {
      await writeAuditLog({
        actorRole,
        actorId,
        action: 'PAYMENT_MERCADOPAGO_SYNCED',
        entity: 'Payment',
        entityId: lockedPayment.id,
        meta: {
          appointmentId: lockedAppointment.id,
          providerPaymentId,
          providerStatus,
          nextStatus,
          source
        },
        transaction
      })
    }
  })

  const refreshed = await Appointment.findByPk(appointmentId, {
    include: appointmentWithPaymentInclude
  })

  if (becamePaid) {
    queueAppointmentConfirmationMessage(refreshed)
  }

  logger.info(
    {
      source,
      appointmentId: refreshed.id,
      localPaymentId: refreshed.payment?.id || null,
      providerPaymentId,
      providerStatus,
      localStatus: refreshed.payment?.status || null,
      appointmentStatus: refreshed.status,
      webhookRecorded
    },
    'mercadopago-payment-reconciled'
  )

  return refreshed
}

export const processMercadoPagoWebhookPayment = async ({
  mpPayment,
  webhookNotification
}) => {
  const appointment = await findAppointmentForMercadoPagoPayment(mpPayment)

  if (!appointment || !appointment.payment) {
    logger.warn(
      {
        providerPaymentId: String(mpPayment?.id || ''),
        preferenceId: String(mpPayment?.preference_id || ''),
        externalReference: String(mpPayment?.external_reference || ''),
        webhookNotification
      },
      'mercadopago-webhook-payment-without-local-match'
    )
    return { matched: false }
  }

  assertMercadoPagoPaymentMatchesAppointment({ appointment, mpPayment })

  logger.info(
    {
      providerPaymentId: String(mpPayment?.id || ''),
      externalReference: String(mpPayment?.external_reference || ''),
      preferenceId: String(mpPayment?.preference_id || ''),
      providerStatus: String(mpPayment?.status || ''),
      appointmentId: appointment.id,
      localPaymentId: appointment.payment.id
    },
    'mercadopago-webhook-payment-matched'
  )

  const refreshedAppointment = await syncMercadoPagoPaymentLocally({
    appointmentId: appointment.id,
    mpPayment,
    actorRole: 'system',
    actorId: null,
    webhookNotification
  })

  return {
    matched: true,
    appointmentId: refreshedAppointment.id,
    paymentId: refreshedAppointment.payment?.id || null,
    paymentStatus: refreshedAppointment.payment?.status || null,
    providerStatus: refreshedAppointment.payment?.providerStatus || null
  }
}

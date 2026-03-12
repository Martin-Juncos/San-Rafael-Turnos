import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler.js'
import { validate } from '../middlewares/validate.js'
import { authenticateJwt } from '../middlewares/authenticateJwt.js'
import { requireRoles } from '../middlewares/requireRoles.js'
import { paymentsLimiter, webhookLimiter } from '../middlewares/rateLimiters.js'
import {
  confirmMockPayment,
  createMercadoPagoPreferenceForAppointment,
  receiveMercadoPagoWebhook,
  syncMercadoPagoPayment,
  getPaymentByAppointment,
  updatePaymentStatusByAppointment,
  confirmMockPaymentSchema,
  createMercadoPagoPreferenceSchema,
  syncMercadoPagoPaymentSchema,
  paymentByAppointmentSchema,
  updatePaymentStatusSchema
} from '../controllers/paymentController.js'

const router = Router()

router.post('/mercadopago/webhook', webhookLimiter, asyncHandler(receiveMercadoPagoWebhook))
router.post('/mock/confirm', paymentsLimiter, authenticateJwt, requireRoles('patient'), validate(confirmMockPaymentSchema), asyncHandler(confirmMockPayment))
router.post(
  '/mercadopago/preference',
  paymentsLimiter,
  authenticateJwt,
  requireRoles('patient'),
  validate(createMercadoPagoPreferenceSchema),
  asyncHandler(createMercadoPagoPreferenceForAppointment)
)
router.post(
  '/mercadopago/sync',
  paymentsLimiter,
  authenticateJwt,
  requireRoles('patient'),
  validate(syncMercadoPagoPaymentSchema),
  asyncHandler(syncMercadoPagoPayment)
)
router.get('/:appointmentId', authenticateJwt, validate(paymentByAppointmentSchema), asyncHandler(getPaymentByAppointment))
router.patch(
  '/:appointmentId/status',
  authenticateJwt,
  requireRoles('admin', 'clinic', 'doctor'),
  validate(updatePaymentStatusSchema),
  asyncHandler(updatePaymentStatusByAppointment)
)

export default router

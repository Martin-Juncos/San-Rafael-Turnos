import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler.js'
import { validate } from '../middlewares/validate.js'
import { authenticateJwt } from '../middlewares/authenticateJwt.js'
import { requireRoles } from '../middlewares/requireRoles.js'
import {
  confirmMockPayment,
  createMercadoPagoPreferenceForAppointment,
  syncMercadoPagoPayment,
  mercadoPagoWebhook,
  getPaymentByAppointment,
  updatePaymentStatusByAppointment,
  confirmMockPaymentSchema,
  createMercadoPagoPreferenceSchema,
  syncMercadoPagoPaymentSchema,
  paymentByAppointmentSchema,
  updatePaymentStatusSchema
} from '../controllers/paymentController.js'

const router = Router()

router.post('/mercadopago/webhook', asyncHandler(mercadoPagoWebhook))
router.get('/mercadopago/webhook', asyncHandler(mercadoPagoWebhook))

router.post('/mock/confirm', authenticateJwt, requireRoles('patient'), validate(confirmMockPaymentSchema), asyncHandler(confirmMockPayment))
router.post(
  '/mercadopago/preference',
  authenticateJwt,
  requireRoles('patient'),
  validate(createMercadoPagoPreferenceSchema),
  asyncHandler(createMercadoPagoPreferenceForAppointment)
)
router.post(
  '/mercadopago/sync',
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

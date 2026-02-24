import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler.js'
import { validate } from '../middlewares/validate.js'
import { authenticateJwt } from '../middlewares/authenticateJwt.js'
import { requireRoles } from '../middlewares/requireRoles.js'
import {
  confirmMockPayment,
  getPaymentByAppointment,
  confirmMockPaymentSchema,
  paymentByAppointmentSchema
} from '../controllers/paymentController.js'

const router = Router()

router.post('/mock/confirm', authenticateJwt, requireRoles('patient'), validate(confirmMockPaymentSchema), asyncHandler(confirmMockPayment))
router.get('/:appointmentId', authenticateJwt, validate(paymentByAppointmentSchema), asyncHandler(getPaymentByAppointment))

export default router

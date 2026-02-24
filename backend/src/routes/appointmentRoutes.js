import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler.js'
import { validate } from '../middlewares/validate.js'
import { authenticateJwt } from '../middlewares/authenticateJwt.js'
import { requireRoles } from '../middlewares/requireRoles.js'
import { messagesLimiter } from '../middlewares/rateLimiters.js'
import {
  createAppointment,
  listMyAppointments,
  listAppointments,
  getAppointmentById,
  patchAppointment,
  cancelAppointment,
  rescheduleAppointment,
  createAppointmentSchema,
  myAppointmentsSchema,
  listAppointmentsSchema,
  appointmentIdSchema,
  patchAppointmentSchema,
  cancelAppointmentSchema,
  rescheduleAppointmentSchema
} from '../controllers/appointmentController.js'
import {
  getMessagesByAppointment,
  postMessageByAppointment,
  appointmentMessagesSchema,
  postMessageSchema
} from '../controllers/messageController.js'

const router = Router()

router.post('/', authenticateJwt, validate(createAppointmentSchema), asyncHandler(createAppointment))
router.get('/my', authenticateJwt, requireRoles('patient'), validate(myAppointmentsSchema), asyncHandler(listMyAppointments))
router.get('/', authenticateJwt, validate(listAppointmentsSchema), asyncHandler(listAppointments))
router.get('/:id', authenticateJwt, validate(appointmentIdSchema), asyncHandler(getAppointmentById))
router.patch('/:id', authenticateJwt, validate(patchAppointmentSchema), asyncHandler(patchAppointment))
router.post('/:id/cancel', authenticateJwt, validate(cancelAppointmentSchema), asyncHandler(cancelAppointment))
router.post(
  '/:id/reschedule',
  authenticateJwt,
  requireRoles('clinic', 'admin'),
  validate(rescheduleAppointmentSchema),
  asyncHandler(rescheduleAppointment)
)
router.get('/:id/messages', messagesLimiter, authenticateJwt, validate(appointmentMessagesSchema), asyncHandler(getMessagesByAppointment))
router.post('/:id/messages', authenticateJwt, validate(postMessageSchema), asyncHandler(postMessageByAppointment))

export default router

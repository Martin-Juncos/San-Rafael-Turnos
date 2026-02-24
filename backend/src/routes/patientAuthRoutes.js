import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler.js'
import { validate } from '../middlewares/validate.js'
import { authLimiter } from '../middlewares/rateLimiters.js'
import {
  requestOtp,
  verifyOtp,
  requestOtpSchema,
  verifyOtpSchema
} from '../controllers/patientAuthController.js'

const router = Router()

router.post('/request-otp', authLimiter, validate(requestOtpSchema), asyncHandler(requestOtp))
router.post('/verify-otp', authLimiter, validate(verifyOtpSchema), asyncHandler(verifyOtp))

export default router

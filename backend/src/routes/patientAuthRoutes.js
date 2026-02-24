import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler.js'
import { validate } from '../middlewares/validate.js'
import { authLimiter } from '../middlewares/rateLimiters.js'
import {
  loginPatient,
  patientLoginSchema
} from '../controllers/patientAuthController.js'

const router = Router()

router.post('/login', authLimiter, validate(patientLoginSchema), asyncHandler(loginPatient))

export default router

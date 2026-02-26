import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler.js'
import { validate } from '../middlewares/validate.js'
import { authLimiter } from '../middlewares/rateLimiters.js'
import {
  loginPatient,
  patientLoginSchema,
  patientPrefillSchema,
  prefillPatientByDni
} from '../controllers/patientAuthController.js'

const router = Router()

router.get('/prefill', authLimiter, validate(patientPrefillSchema), asyncHandler(prefillPatientByDni))
router.post('/login', authLimiter, validate(patientLoginSchema), asyncHandler(loginPatient))

export default router

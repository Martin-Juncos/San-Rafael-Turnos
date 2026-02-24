import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler.js'
import { validate } from '../middlewares/validate.js'
import { authLimiter } from '../middlewares/rateLimiters.js'
import {
  login,
  refresh,
  logout,
  loginSchema,
  refreshSchema,
  logoutSchema
} from '../controllers/authController.js'

const router = Router()

router.post('/login', authLimiter, validate(loginSchema), asyncHandler(login))
router.post('/refresh', authLimiter, validate(refreshSchema), asyncHandler(refresh))
router.post('/logout', validate(logoutSchema), asyncHandler(logout))

export default router

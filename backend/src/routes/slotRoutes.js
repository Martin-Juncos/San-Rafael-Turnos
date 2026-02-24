import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler.js'
import { validate } from '../middlewares/validate.js'
import { listAvailableSlots, slotsQuerySchema } from '../controllers/slotController.js'

const router = Router()

router.get('/', validate(slotsQuerySchema), asyncHandler(listAvailableSlots))

export default router

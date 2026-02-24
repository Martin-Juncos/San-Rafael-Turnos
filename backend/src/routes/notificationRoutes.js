import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler.js'
import { validate } from '../middlewares/validate.js'
import { authenticateJwt } from '../middlewares/authenticateJwt.js'
import { requireRoles } from '../middlewares/requireRoles.js'
import { sendWhatsapp, sendWhatsappSchema } from '../controllers/notificationController.js'

const router = Router()

router.post('/whatsapp/send', authenticateJwt, requireRoles('admin', 'clinic'), validate(sendWhatsappSchema), asyncHandler(sendWhatsapp))

export default router

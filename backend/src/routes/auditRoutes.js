import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler.js'
import { validate } from '../middlewares/validate.js'
import { authenticateJwt } from '../middlewares/authenticateJwt.js'
import { requireRoles } from '../middlewares/requireRoles.js'
import { listAuditLogs, listAuditLogsSchema } from '../controllers/auditController.js'

const router = Router()

router.get('/', authenticateJwt, requireRoles('admin'), validate(listAuditLogsSchema), asyncHandler(listAuditLogs))

export default router

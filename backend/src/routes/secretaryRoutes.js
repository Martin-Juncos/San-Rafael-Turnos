import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler.js'
import { validate } from '../middlewares/validate.js'
import { authenticateJwt } from '../middlewares/authenticateJwt.js'
import { requireRoles } from '../middlewares/requireRoles.js'
import {
  listSecretaries,
  createSecretary,
  deleteSecretary,
  listSecretariesSchema,
  createSecretarySchema,
  secretaryIdSchema
} from '../controllers/secretaryController.js'

const router = Router()

router.get('/', authenticateJwt, requireRoles('admin'), validate(listSecretariesSchema), asyncHandler(listSecretaries))
router.post('/', authenticateJwt, requireRoles('admin'), validate(createSecretarySchema), asyncHandler(createSecretary))
router.delete('/:id', authenticateJwt, requireRoles('admin'), validate(secretaryIdSchema), asyncHandler(deleteSecretary))

export default router

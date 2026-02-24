import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler.js'
import { validate } from '../middlewares/validate.js'
import { optionalAuthenticateJwt } from '../middlewares/optionalAuthenticateJwt.js'
import { authenticateJwt } from '../middlewares/authenticateJwt.js'
import { requireRoles } from '../middlewares/requireRoles.js'
import {
  listInsurances,
  createInsurance,
  updateInsurance,
  deleteInsurance,
  listInsurancesSchema,
  createInsuranceSchema,
  updateInsuranceSchema,
  insuranceIdSchema
} from '../controllers/insuranceController.js'

const router = Router()

router.get('/', optionalAuthenticateJwt, validate(listInsurancesSchema), asyncHandler(listInsurances))
router.post('/', authenticateJwt, requireRoles('admin'), validate(createInsuranceSchema), asyncHandler(createInsurance))
router.patch('/:id', authenticateJwt, requireRoles('admin'), validate(updateInsuranceSchema), asyncHandler(updateInsurance))
router.delete('/:id', authenticateJwt, requireRoles('admin'), validate(insuranceIdSchema), asyncHandler(deleteInsurance))

export default router

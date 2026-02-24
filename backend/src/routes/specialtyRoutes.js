import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler.js'
import { validate } from '../middlewares/validate.js'
import { authenticateJwt } from '../middlewares/authenticateJwt.js'
import { optionalAuthenticateJwt } from '../middlewares/optionalAuthenticateJwt.js'
import { requireRoles } from '../middlewares/requireRoles.js'
import {
  listSpecialties,
  createSpecialty,
  updateSpecialty,
  deleteSpecialty,
  listSpecialtiesSchema,
  createSpecialtySchema,
  updateSpecialtySchema,
  idParamSchema
} from '../controllers/specialtyController.js'

const router = Router()

router.get('/', optionalAuthenticateJwt, validate(listSpecialtiesSchema), asyncHandler(listSpecialties))
router.post('/', authenticateJwt, requireRoles('admin'), validate(createSpecialtySchema), asyncHandler(createSpecialty))
router.patch('/:id', authenticateJwt, requireRoles('admin'), validate(updateSpecialtySchema), asyncHandler(updateSpecialty))
router.delete('/:id', authenticateJwt, requireRoles('admin'), validate(idParamSchema), asyncHandler(deleteSpecialty))

export default router

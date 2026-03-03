import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler.js'
import { validate } from '../middlewares/validate.js'
import { optionalAuthenticateJwt } from '../middlewares/optionalAuthenticateJwt.js'
import { authenticateJwt } from '../middlewares/authenticateJwt.js'
import { requireRoles } from '../middlewares/requireRoles.js'
import { requireDoctorOwnershipByParam } from '../middlewares/requireOwnership.js'
import {
  listDoctors,
  getDoctorById,
  createDoctor,
  updateDoctor,
  deleteDoctor,
  getDoctorAvailability,
  putDoctorAvailability,
  createDoctorBlock,
  deleteDoctorBlock,
  listDoctorsSchema,
  doctorIdParamSchema,
  createDoctorSchema,
  updateDoctorSchema,
  updateAvailabilitySchema,
  createBlockSchema,
  deleteBlockSchema
} from '../controllers/doctorController.js'

const router = Router()

router.get('/', optionalAuthenticateJwt, validate(listDoctorsSchema), asyncHandler(listDoctors))
router.get('/:id', validate(doctorIdParamSchema), asyncHandler(getDoctorById))

router.post('/', authenticateJwt, requireRoles('admin'), validate(createDoctorSchema), asyncHandler(createDoctor))
router.patch('/:id', authenticateJwt, requireRoles('admin'), validate(updateDoctorSchema), asyncHandler(updateDoctor))
router.delete('/:id', authenticateJwt, requireRoles('admin'), validate(doctorIdParamSchema), asyncHandler(deleteDoctor))

router.get(
  '/:id/availability',
  authenticateJwt,
  validate(doctorIdParamSchema),
  requireDoctorOwnershipByParam(),
  asyncHandler(getDoctorAvailability)
)
router.put(
  '/:id/availability',
  authenticateJwt,
  requireRoles('admin'),
  validate(updateAvailabilitySchema),
  asyncHandler(putDoctorAvailability)
)
router.post(
  '/:id/blocks',
  authenticateJwt,
  requireRoles('clinic', 'admin'),
  validate(createBlockSchema),
  asyncHandler(createDoctorBlock)
)
router.delete(
  '/:id/blocks/:blockId',
  authenticateJwt,
  requireRoles('clinic', 'admin'),
  validate(deleteBlockSchema),
  asyncHandler(deleteDoctorBlock)
)

export default router

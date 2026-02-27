import { Router } from 'express'
import authRoutes from './authRoutes.js'
import patientAuthRoutes from './patientAuthRoutes.js'
import specialtyRoutes from './specialtyRoutes.js'
import insuranceRoutes from './insuranceRoutes.js'
import doctorRoutes from './doctorRoutes.js'
import slotRoutes from './slotRoutes.js'
import appointmentRoutes from './appointmentRoutes.js'
import paymentRoutes from './paymentRoutes.js'
import notificationRoutes from './notificationRoutes.js'
import auditRoutes from './auditRoutes.js'
import newsRoutes from './newsRoutes.js'
import secretaryRoutes from './secretaryRoutes.js'

const router = Router()

router.use('/auth', authRoutes)
router.use('/patient/auth', patientAuthRoutes)
router.use('/specialties', specialtyRoutes)
router.use('/insurances', insuranceRoutes)
router.use('/doctors', doctorRoutes)
router.use('/slots', slotRoutes)
router.use('/appointments', appointmentRoutes)
router.use('/payments', paymentRoutes)
router.use('/notifications', notificationRoutes)
router.use('/audit-logs', auditRoutes)
router.use('/news', newsRoutes)
router.use('/secretaries', secretaryRoutes)

export default router

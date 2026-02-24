import { z } from 'zod'
import { getAvailableSlots } from '../services/appointmentService.js'
import { ok } from '../utils/response.js'

export const slotsQuerySchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    doctorId: z.string().uuid(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
  })
})

export const listAvailableSlots = async (req, res) => {
  const { doctorId, date } = req.validated.query
  const slots = await getAvailableSlots({ doctorId, date })
  ok(res, {
    doctorId,
    date,
    slotMinutes: 30,
    slots
  })
}

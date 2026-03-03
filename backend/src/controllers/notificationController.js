import { z } from 'zod'
import { sendWhatsAppMessage } from '../services/notificationService.js'
import { ok } from '../utils/response.js'
import { phoneSchema } from '../validators/common.js'

export const sendWhatsappSchema = z.object({
  body: z.object({
    to: phoneSchema,
    body: z.string().min(1).max(4000),
    templateName: z.string().optional()
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional()
})

export const sendWhatsapp = async (req, res) => {
  const result = await sendWhatsAppMessage(req.validated.body)
  ok(res, result, 'whatsapp_sent')
}

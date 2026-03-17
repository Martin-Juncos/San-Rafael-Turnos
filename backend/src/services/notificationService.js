import { config } from '../config/env.js'
import { logger } from '../config/logger.js'

export const buildAppointmentConfirmationMessage = ({
  patientName,
  doctorName,
  date,
  time
}) => {
  return `Gracias ${patientName} por elegir nuestro servicio, el Dr. ${doctorName} lo espera el dia ${date} a las ${time}. Ante cualquier duda puede escribirnos ingresando a la aplicacion con su DNI. Saludos.`
}

export const sendWhatsAppMessage = async ({ to, body, templateName = 'default' }) => {
  if (config.WHATSAPP_PROVIDER !== 'mock') {
    throw new Error('Proveedor de WhatsApp no soportado en MVP')
  }

  logger.info(
    {
      channel: 'whatsapp',
      provider: config.WHATSAPP_PROVIDER,
      from: config.WHATSAPP_FROM_NUMBER || null,
      to,
      templateName,
      body
    },
    'mock-whatsapp-sent'
  )

  return {
    provider: 'mock',
    delivered: true,
    externalId: `mock-${Date.now()}`
  }
}

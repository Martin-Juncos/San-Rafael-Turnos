import { httpClient, unwrapData } from '../client'

export const notificationsService = {
  sendWhatsapp: async (payload) => unwrapData(await httpClient.post('/notifications/whatsapp/send', payload))
}


import { httpClient, unwrapData } from '../httpClient'

export const notificationsService = {
  sendWhatsapp: async (payload) => unwrapData(await httpClient.post('/notifications/whatsapp/send', payload))
}

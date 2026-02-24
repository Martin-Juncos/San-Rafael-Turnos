import { httpClient, unwrapData } from '../httpClient'

export const paymentsService = {
  confirmMock: async (appointmentId) => unwrapData(await httpClient.post('/payments/mock/confirm', { appointmentId })),
  getByAppointment: async (appointmentId) => unwrapData(await httpClient.get(`/payments/${appointmentId}`))
}

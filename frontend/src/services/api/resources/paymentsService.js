import { httpClient, unwrapData } from '../client'

export const paymentsService = {
  confirmMock: async (appointmentId) => unwrapData(await httpClient.post('/payments/mock/confirm', { appointmentId })),
  updateStatus: async (appointmentId, status) => unwrapData(
    await httpClient.patch(`/payments/${appointmentId}/status`, { status })
  ),
  createMercadoPagoPreference: async (appointmentId) => unwrapData(
    await httpClient.post('/payments/mercadopago/preference', { appointmentId })
  ),
  syncMercadoPago: async (appointmentId, paymentId) => unwrapData(
    await httpClient.post('/payments/mercadopago/sync', { appointmentId, paymentId })
  ),
  getByAppointment: async (appointmentId) => unwrapData(await httpClient.get(`/payments/${appointmentId}`))
}


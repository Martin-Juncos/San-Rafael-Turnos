import { httpClient, unwrapCollection, unwrapData } from '../client'
import { toQueryParams } from '../query'

export const appointmentsService = {
  create: async (payload) => unwrapData(await httpClient.post('/appointments', payload)),
  listMy: async (query = {}) => {
    const response = await httpClient.get('/appointments/my', { params: toQueryParams(query) })
    return unwrapCollection(response)
  },
  list: async (query = {}) => {
    const response = await httpClient.get('/appointments', { params: toQueryParams(query) })
    return unwrapCollection(response)
  },
  getById: async (id) => unwrapData(await httpClient.get(`/appointments/${id}`)),
  update: async (id, payload) => unwrapData(await httpClient.patch(`/appointments/${id}`, payload)),
  cancel: async (id, reason) => unwrapData(await httpClient.post(`/appointments/${id}/cancel`, { reason })),
  reschedule: async (id, payload) => unwrapData(await httpClient.post(`/appointments/${id}/reschedule`, payload)),
  getConsultNote: async (id) => unwrapData(await httpClient.get(`/appointments/${id}/consult-note`)),
  createConsultNote: async (id, payload) => unwrapData(await httpClient.post(`/appointments/${id}/consult-note`, payload)),
  updateConsultNote: async (id, payload) => unwrapData(await httpClient.patch(`/appointments/${id}/consult-note`, payload)),
  listMessages: async (id) => unwrapData(await httpClient.get(`/appointments/${id}/messages`)),
  sendMessage: async (id, body) => unwrapData(await httpClient.post(`/appointments/${id}/messages`, { body }))
}


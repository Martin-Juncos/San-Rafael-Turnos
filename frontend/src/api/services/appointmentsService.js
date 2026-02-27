import { httpClient, unwrapData } from '../httpClient'

const toParams = (query = {}) => Object.fromEntries(Object.entries(query).filter(([, value]) => value !== undefined && value !== ''))

export const appointmentsService = {
  create: async (payload) => unwrapData(await httpClient.post('/appointments', payload)),
  listMy: async (query = {}) => {
    const response = await httpClient.get('/appointments/my', { params: toParams(query) })
    return {
      items: response.data.data,
      pagination: response.data.pagination
    }
  },
  list: async (query = {}) => {
    const response = await httpClient.get('/appointments', { params: toParams(query) })
    return {
      items: response.data.data,
      pagination: response.data.pagination
    }
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

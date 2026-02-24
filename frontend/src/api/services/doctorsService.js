import { httpClient, unwrapData } from '../httpClient'

const toParams = (query = {}) => Object.fromEntries(Object.entries(query).filter(([, value]) => value !== undefined && value !== ''))

export const doctorsService = {
  list: async (query = {}) => {
    const response = await httpClient.get('/doctors', { params: toParams(query) })
    return {
      items: response.data.data,
      pagination: response.data.pagination
    }
  },
  getById: async (id) => unwrapData(await httpClient.get(`/doctors/${id}`)),
  create: async (payload) => unwrapData(await httpClient.post('/doctors', payload)),
  update: async (id, payload) => unwrapData(await httpClient.patch(`/doctors/${id}`, payload)),
  remove: async (id) => unwrapData(await httpClient.delete(`/doctors/${id}`)),
  getAvailability: async (id) => unwrapData(await httpClient.get(`/doctors/${id}/availability`)),
  updateAvailability: async (id, availability) => unwrapData(await httpClient.put(`/doctors/${id}/availability`, { availability })),
  createBlock: async (id, payload) => unwrapData(await httpClient.post(`/doctors/${id}/blocks`, payload)),
  removeBlock: async (id, blockId) => unwrapData(await httpClient.delete(`/doctors/${id}/blocks/${blockId}`))
}

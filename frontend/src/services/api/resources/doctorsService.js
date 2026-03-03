import { createCrudService } from '../createCrudService'
import { httpClient, unwrapData } from '../client'

const baseService = createCrudService('/doctors')

export const doctorsService = {
  ...baseService,
  getAvailability: async (id) => unwrapData(await httpClient.get(`/doctors/${id}/availability`)),
  updateAvailability: async (id, availability) => unwrapData(await httpClient.put(`/doctors/${id}/availability`, { availability })),
  createBlock: async (id, payload) => unwrapData(await httpClient.post(`/doctors/${id}/blocks`, payload)),
  removeBlock: async (id, blockId) => unwrapData(await httpClient.delete(`/doctors/${id}/blocks/${blockId}`))
}


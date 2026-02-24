import { httpClient, unwrapData } from '../httpClient'

const toParams = (query = {}) => Object.fromEntries(Object.entries(query).filter(([, value]) => value !== undefined && value !== ''))

export const insurancesService = {
  list: async (query = {}) => {
    const response = await httpClient.get('/insurances', { params: toParams(query) })
    return {
      items: response.data.data,
      pagination: response.data.pagination
    }
  },
  create: async (payload) => unwrapData(await httpClient.post('/insurances', payload)),
  update: async (id, payload) => unwrapData(await httpClient.patch(`/insurances/${id}`, payload)),
  remove: async (id) => unwrapData(await httpClient.delete(`/insurances/${id}`))
}

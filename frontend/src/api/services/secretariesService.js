import { httpClient, unwrapData } from '../httpClient'

const toParams = (query = {}) => Object.fromEntries(Object.entries(query).filter(([, value]) => value !== undefined && value !== ''))

export const secretariesService = {
  list: async (query = {}) => {
    const response = await httpClient.get('/secretaries', { params: toParams(query) })
    return {
      items: response.data.data,
      pagination: response.data.pagination
    }
  },
  create: async (payload) => unwrapData(await httpClient.post('/secretaries', payload)),
  update: async (id, payload) => unwrapData(await httpClient.patch(`/secretaries/${id}`, payload)),
  remove: async (id) => unwrapData(await httpClient.delete(`/secretaries/${id}`))
}

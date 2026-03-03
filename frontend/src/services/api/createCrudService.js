import { httpClient, unwrapCollection, unwrapData } from './client'
import { toQueryParams } from './query'

export const createCrudService = (resourcePath) => ({
  list: async (query = {}) => {
    const response = await httpClient.get(resourcePath, { params: toQueryParams(query) })
    return unwrapCollection(response)
  },
  getById: async (id) => unwrapData(await httpClient.get(`${resourcePath}/${id}`)),
  create: async (payload) => unwrapData(await httpClient.post(resourcePath, payload)),
  update: async (id, payload) => unwrapData(await httpClient.patch(`${resourcePath}/${id}`, payload)),
  remove: async (id) => unwrapData(await httpClient.delete(`${resourcePath}/${id}`))
})


import { httpClient, unwrapData } from '../httpClient'

export const authService = {
  login: async (payload) => unwrapData(await httpClient.post('/auth/login', payload)),
  refresh: async (payload) => unwrapData(await httpClient.post('/auth/refresh', payload)),
  logout: async (payload) => unwrapData(await httpClient.post('/auth/logout', payload))
}

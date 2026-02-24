import { httpClient, unwrapData } from '../httpClient'

export const patientAuthService = {
  login: async (payload) => unwrapData(await httpClient.post('/patient/auth/login', payload))
}

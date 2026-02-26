import { httpClient, unwrapData } from '../httpClient'

export const patientAuthService = {
  prefillByDni: async (dni) => unwrapData(await httpClient.get('/patient/auth/prefill', { params: { dni } })),
  login: async (payload) => unwrapData(await httpClient.post('/patient/auth/login', payload))
}

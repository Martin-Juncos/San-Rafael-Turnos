import { httpClient, unwrapData } from '../httpClient'

export const patientAuthService = {
  requestOtp: async (payload) => unwrapData(await httpClient.post('/patient/auth/request-otp', payload)),
  verifyOtp: async (payload) => unwrapData(await httpClient.post('/patient/auth/verify-otp', payload))
}

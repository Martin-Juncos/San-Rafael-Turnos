import { httpClient, unwrapData } from '../httpClient'

export const slotsService = {
  list: async ({ doctorId, date }) => unwrapData(await httpClient.get('/slots', { params: { doctorId, date } }))
}

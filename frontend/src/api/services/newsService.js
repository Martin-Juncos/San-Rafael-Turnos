import { httpClient } from '../httpClient'

const toParams = (query = {}) => Object.fromEntries(
  Object.entries(query).filter(([, value]) => value !== undefined && value !== '')
)

export const newsService = {
  list: async (query = {}) => {
    const response = await httpClient.get('/news', { params: toParams(query) })
    const payload = response?.data?.data || {}
    return {
      items: Array.isArray(payload.items) ? payload.items : [],
      meta: {
        source: payload.source || '',
        sourceUrl: payload.sourceUrl || '',
        refreshEveryMinutes: payload.refreshEveryMinutes || 0,
        fetchedAt: payload.fetchedAt || null,
        stale: Boolean(payload.stale)
      }
    }
  },
  getById: async (id) => {
    const response = await httpClient.get(`/news/${id}`)
    return response?.data?.data || null
  }
}

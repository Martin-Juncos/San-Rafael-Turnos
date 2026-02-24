import axios from 'axios'
import { ApiError, toApiError } from './apiError'

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

export const httpClient = axios.create({
  baseURL,
  timeout: 12000
})

httpClient.interceptors.request.use((request) => {
  const token = localStorage.getItem('srt_access_token')
  if (token) {
    request.headers.Authorization = `Bearer ${token}`
  }
  return request
})

httpClient.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(toApiError(error))
)

export const unwrapData = (response) => {
  if (response?.data?.ok) {
    return response.data.data
  }
  if (response?.data) {
    return response.data
  }
  throw new ApiError('Respuesta inesperada', 500, 'invalid_response')
}

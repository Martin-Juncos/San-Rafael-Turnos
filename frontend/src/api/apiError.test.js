import { describe, it, expect } from 'vitest'
import { toApiError } from './apiError'

describe('toApiError', () => {
  it('maps network errors', () => {
    const error = toApiError({})
    expect(error.code).toBe('network_error')
  })

  it('maps api payload errors', () => {
    const error = toApiError({
      response: {
        status: 400,
        data: {
          message: 'Datos invalidos',
          error: {
            code: 'validation_error'
          }
        }
      }
    })
    expect(error.status).toBe(400)
    expect(error.code).toBe('validation_error')
  })
})

import { config } from '../config/env.js'

export const createMockPaymentIntent = ({ appointmentId, amount }) => {
  return {
    appointmentId,
    provider: 'mock',
    amount,
    currency: config.PAYMENT_DEFAULT_CURRENCY,
    clientSecret: `mock_secret_${appointmentId}`
  }
}

import crypto from 'crypto'
import { config } from '../config/env.js'
import { AppError } from '../utils/errors.js'

const MP_API_BASE = 'https://api.mercadopago.com'

const parseJsonSafe = async (response) => {
  try {
    return await response.json()
  } catch (_error) {
    return null
  }
}

const ensureMercadoPagoEnabled = () => {
  if (!config.MERCADOPAGO_ACCESS_TOKEN) {
    throw new AppError(
      'Mercado Pago no esta configurado en este entorno',
      503,
      'mercadopago_not_configured'
    )
  }
}

const buildAuthHeaders = () => ({
  Authorization: `Bearer ${config.MERCADOPAGO_ACCESS_TOKEN}`,
  'Content-Type': 'application/json'
})

export const createMercadoPagoPreference = async (payload) => {
  ensureMercadoPagoEnabled()

  const response = await globalThis.fetch(`${MP_API_BASE}/checkout/preferences`, {
    method: 'POST',
    headers: buildAuthHeaders(),
    body: JSON.stringify(payload)
  })

  const data = await parseJsonSafe(response)
  if (!response.ok) {
    const normalizedStatus = response.status >= 500 ? 502 : 400
    throw new AppError(
      data?.message || 'No se pudo crear la preferencia de pago',
      normalizedStatus,
      'mercadopago_preference_error'
    )
  }

  return data
}

export const getMercadoPagoPaymentById = async (paymentId) => {
  ensureMercadoPagoEnabled()

  const response = await globalThis.fetch(`${MP_API_BASE}/v1/payments/${paymentId}`, {
    method: 'GET',
    headers: buildAuthHeaders()
  })

  const data = await parseJsonSafe(response)
  if (!response.ok) {
    const normalizedStatus = response.status >= 500 ? 502 : 400
    throw new AppError(
      data?.message || 'No se pudo consultar el estado del pago',
      normalizedStatus,
      'mercadopago_payment_lookup_error'
    )
  }

  return data
}

export const verifyMercadoPagoWebhookSignature = ({
  signature,
  requestId,
  dataId
}) => {
  if (!config.MERCADOPAGO_WEBHOOK_SECRET) return true
  if (!signature || !requestId || !dataId) return false

  const entries = signature
    .split(',')
    .map((chunk) => chunk.trim())
    .map((chunk) => chunk.split('='))
    .filter((parts) => parts.length === 2)

  const map = Object.fromEntries(entries)
  const ts = map.ts
  const providedHash = map.v1

  if (!ts || !providedHash) return false

  const manifest = `id:${String(dataId).toLowerCase()};request-id:${requestId};ts:${ts};`
  const expectedHash = crypto
    .createHmac('sha256', config.MERCADOPAGO_WEBHOOK_SECRET)
    .update(manifest)
    .digest('hex')

  const expectedBuffer = Buffer.from(expectedHash, 'utf8')
  const providedBuffer = Buffer.from(providedHash, 'utf8')
  if (expectedBuffer.length !== providedBuffer.length) return false
  return crypto.timingSafeEqual(expectedBuffer, providedBuffer)
}

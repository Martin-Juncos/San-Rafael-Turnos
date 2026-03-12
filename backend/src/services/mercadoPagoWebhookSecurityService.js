import crypto from 'node:crypto'
import { config } from '../config/env.js'
import { AppError } from '../utils/errors.js'

const WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS = 300

const extractSignatureParts = (signatureHeader = '') => {
  return String(signatureHeader)
    .split(',')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .reduce((accumulator, segment) => {
      const [key, value] = segment.split('=')
      if (!key || !value) return accumulator
      accumulator[key.trim().toLowerCase()] = value.trim()
      return accumulator
    }, {})
}

const resolveMercadoPagoDataId = (req) => {
  const body = req.body || {}
  const query = req.query || {}
  const resource = String(body.resource || '').trim()

  return String(
    body.data?.id ||
    query['data.id'] ||
    query.id ||
    (resource.startsWith('http') ? resource.split('/').filter(Boolean).pop() : resource) ||
    ''
  ).trim()
}

const buildManifest = ({ dataId, requestId, timestamp }) => {
  return `id:${dataId};request-id:${requestId};ts:${timestamp};`
}

const safeEqualHex = (left, right) => {
  const leftBuffer = Buffer.from(String(left || ''), 'hex')
  const rightBuffer = Buffer.from(String(right || ''), 'hex')
  if (leftBuffer.length === 0 || leftBuffer.length !== rightBuffer.length) {
    return false
  }
  return crypto.timingSafeEqual(leftBuffer, rightBuffer)
}

export const validateMercadoPagoWebhookSignature = (req, options = {}) => {
  const secret = String(options.secret ?? config.MERCADOPAGO_WEBHOOK_SECRET ?? '').trim()
  if (!secret) {
    return {
      enabled: false,
      valid: true,
      reason: 'secret_not_configured'
    }
  }

  const signatureHeader = req.headers['x-signature']
  const requestIdHeader = req.headers['x-request-id']
  const signature = extractSignatureParts(signatureHeader)
  const timestamp = Number(signature.ts || 0)
  const version = String(signature.v1 || '').trim().toLowerCase()
  const requestId = String(requestIdHeader || '').trim()
  const dataId = resolveMercadoPagoDataId(req)

  if (!timestamp || !version || !requestId || !dataId) {
    throw new AppError('Firma de webhook invalida', 401, 'mercadopago_invalid_signature')
  }

  const nowSeconds = Math.floor(Date.now() / 1000)
  const toleranceSeconds = Number(options.toleranceSeconds || WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS)
  if (Math.abs(nowSeconds - timestamp) > toleranceSeconds) {
    throw new AppError('Firma de webhook expirada', 401, 'mercadopago_expired_signature')
  }

  const manifest = buildManifest({
    dataId,
    requestId,
    timestamp
  })
  const expected = crypto
    .createHmac('sha256', secret)
    .update(manifest)
    .digest('hex')

  if (!safeEqualHex(expected, version)) {
    throw new AppError('Firma de webhook invalida', 401, 'mercadopago_invalid_signature')
  }

  return {
    enabled: true,
    valid: true,
    dataId,
    requestId,
    timestamp,
    reason: 'validated'
  }
}

import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { AppError } from '../src/utils/errors.js'
import { validateMercadoPagoWebhookSignature } from '../src/services/mercadoPagoWebhookSecurityService.js'

const buildRequest = ({ signature, requestId = 'req-123', id = '150081644474', topic = 'payment' } = {}) => ({
  body: {
    resource: id,
    topic
  },
  query: {
    id,
    topic
  },
  headers: {
    'x-request-id': requestId,
    'x-signature': signature
  }
})

test('validateMercadoPagoWebhookSignature acepta firma valida', () => {
  const secret = 'test-secret'
  const ts = Math.floor(Date.now() / 1000)
  const manifest = `id:150081644474;request-id:req-123;ts:${ts};`
  const v1 = crypto.createHmac('sha256', secret).update(manifest).digest('hex')

  const result = validateMercadoPagoWebhookSignature(
    buildRequest({ signature: `ts=${ts},v1=${v1}` }),
    { secret }
  )

  assert.equal(result.valid, true)
  assert.equal(result.enabled, true)
  assert.equal(result.dataId, '150081644474')
})

test('validateMercadoPagoWebhookSignature rechaza firma invalida', () => {
  assert.throws(
    () => validateMercadoPagoWebhookSignature(
      buildRequest({ signature: 'ts=1770000000,v1=deadbeef' }),
      { secret: 'test-secret', toleranceSeconds: Number.MAX_SAFE_INTEGER }
    ),
    (error) => error instanceof AppError && error.code === 'mercadopago_invalid_signature'
  )
})

test('validateMercadoPagoWebhookSignature permite omitir validacion sin secreto', () => {
  const result = validateMercadoPagoWebhookSignature(buildRequest(), { secret: '' })
  assert.equal(result.enabled, false)
  assert.equal(result.valid, true)
})

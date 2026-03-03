import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { app } from '../src/app.js'

test('GET /health responde OK con metadatos basicos', async () => {
  const server = createServer(app)
  await new Promise((resolve) => server.listen(0, resolve))

  try {
    const address = server.address()
    const port = typeof address === 'object' && address ? address.port : 0
    const response = await fetch(`http://127.0.0.1:${port}/health`)
    const body = await response.json()

    assert.equal(response.status, 200)
    assert.equal(body.ok, true)
    assert.equal(body.name, 'san-rafael-turnos-backend')
    assert.equal(body.status, 'up')
    assert.equal(typeof body.timestamp, 'string')
  } finally {
    await new Promise((resolve) => server.close(resolve))
  }
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { requireRoles } from '../src/middlewares/requireRoles.js'
import { requireDoctorOwnershipByParam } from '../src/middlewares/requireOwnership.js'

const runMiddleware = async (middleware, req) => {
  return new Promise((resolve) => {
    middleware(req, {}, (error) => resolve(error || null))
  })
}

test('RBAC: una ruta admin permite admin y rechaza doctor', async () => {
  const adminOnly = requireRoles('admin')

  const noError = await runMiddleware(adminOnly, {
    auth: { role: 'admin' }
  })
  assert.equal(noError, null)

  const forbidden = await runMiddleware(adminOnly, {
    auth: { role: 'doctor' }
  })
  assert.equal(forbidden?.code, 'forbidden')
  assert.equal(forbidden?.statusCode, 403)
})

test('Ownership doctor-self: permite doctor dueño, rechaza doctor externo y permite admin', async () => {
  const guard = requireDoctorOwnershipByParam()

  const doctorSelf = await runMiddleware(guard, {
    auth: { role: 'doctor', doctorId: 'doctor-1' },
    validated: { params: { id: 'doctor-1' } }
  })
  assert.equal(doctorSelf, null)

  const otherDoctor = await runMiddleware(guard, {
    auth: { role: 'doctor', doctorId: 'doctor-1' },
    validated: { params: { id: 'doctor-2' } }
  })
  assert.equal(otherDoctor?.code, 'forbidden')
  assert.equal(otherDoctor?.statusCode, 403)

  const admin = await runMiddleware(guard, {
    auth: { role: 'admin', sub: 'admin-1' },
    validated: { params: { id: 'doctor-2' } }
  })
  assert.equal(admin, null)
})

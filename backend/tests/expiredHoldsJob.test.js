import test from 'node:test'
import assert from 'node:assert/strict'
import {
  __resetExpiredHoldsJobStateForTests,
  runExpiredHoldsBatch
} from '../src/jobs/expiredHoldsJob.js'

const buildDependencies = ({ lockAcquired, releasedCount = 0 }) => {
  const queries = []
  const updateCalls = []
  const auditCalls = []
  const logs = []

  const releasedRows = releasedCount > 0
    ? [
        {
          id: 'appointment-id-1',
          doctorId: 'doctor-id-1',
          patientId: 'patient-id-1',
          date: '2026-03-03',
          startTime: '09:00:00',
          createdAt: new Date('2026-03-03T09:00:00.000Z')
        }
      ]
    : []

  const dependencies = {
    lockKey: '738194776523945381',
    holdMinutes: 10,
    now: () => new Date('2026-03-03T10:00:00.000Z').getTime(),
    sequelize: {
      transaction: async (callback) => callback({ id: 'tx-1' }),
      query: async (sql) => {
        queries.push(sql)
        if (sql.includes('pg_try_advisory_lock')) {
          return [{ acquired: lockAcquired }]
        }
        if (sql.includes('pg_advisory_unlock')) {
          return [{ released: true }]
        }
        throw new Error(`Unexpected SQL: ${sql}`)
      }
    },
    Appointment: {
      update: async (_values, options) => {
        updateCalls.push(options)
        return [releasedCount, releasedRows]
      }
    },
    AuditLog: {
      bulkCreate: async (rows) => {
        auditCalls.push(rows)
      }
    },
    logger: {
      info: (payloadOrMsg, maybeMsg) => logs.push({ level: 'info', payloadOrMsg, maybeMsg }),
      warn: (payloadOrMsg, maybeMsg) => logs.push({ level: 'warn', payloadOrMsg, maybeMsg }),
      error: (payloadOrMsg, maybeMsg) => logs.push({ level: 'error', payloadOrMsg, maybeMsg })
    }
  }

  return {
    dependencies,
    queries,
    updateCalls,
    auditCalls,
    logs
  }
}

test('runExpiredHoldsBatch does not expire holds when advisory lock is not acquired', async () => {
  __resetExpiredHoldsJobStateForTests()
  const fixture = buildDependencies({ lockAcquired: false, releasedCount: 1 })

  const result = await runExpiredHoldsBatch(fixture.dependencies)

  assert.equal(result.skipped, 'lock_not_acquired')
  assert.equal(result.released, 0)
  assert.equal(fixture.updateCalls.length, 0)
  assert.equal(fixture.auditCalls.length, 0)
  assert.equal(fixture.queries.some((sql) => sql.includes('pg_advisory_unlock')), false)
})

test('runExpiredHoldsBatch expires holds when advisory lock is acquired', async () => {
  __resetExpiredHoldsJobStateForTests()
  const fixture = buildDependencies({ lockAcquired: true, releasedCount: 1 })

  const result = await runExpiredHoldsBatch(fixture.dependencies)

  assert.equal(result.skipped, null)
  assert.equal(result.released, 1)
  assert.equal(fixture.updateCalls.length, 1)
  assert.equal(fixture.auditCalls.length, 1)
  assert.equal(fixture.queries.some((sql) => sql.includes('pg_try_advisory_lock')), true)
  assert.equal(fixture.queries.some((sql) => sql.includes('pg_advisory_unlock')), true)
})

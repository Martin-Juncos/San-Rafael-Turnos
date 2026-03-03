import 'dotenv/config'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Appointment, AuditLog, sequelize } from '../src/db/models/index.js'
import { contextFilePath, readContext } from './test_hold_lock_common.mjs'

const TEST_PREFIX = '__codex_hold_lock_test__'

export const teardownHoldLockTestData = async ({ appointmentId: explicitAppointmentId } = {}) => {
  await sequelize.authenticate()

  let context = null
  try {
    context = await readContext()
  } catch {
    context = null
  }

  const appointmentId = explicitAppointmentId || context?.appointmentId
  if (!appointmentId) {
    return {
      removed: false,
      reason: 'appointment_id_missing'
    }
  }

  const appointment = await Appointment.findByPk(appointmentId, { paranoid: false })
  if (!appointment) {
    return {
      removed: false,
      reason: 'appointment_not_found'
    }
  }

  const marker = context?.marker || ''
  const symptoms = String(appointment.symptoms || '')
  const isFixtureRecord = symptoms.startsWith(TEST_PREFIX) || (marker && symptoms === marker)

  if (!isFixtureRecord) {
    return {
      removed: false,
      reason: 'not_fixture_record'
    }
  }

  await AuditLog.destroy({
    where: {
      entity: 'Appointment',
      entityId: appointment.id,
      action: 'APPOINTMENT_HOLD_EXPIRED'
    }
  })

  await appointment.destroy({ force: true })

  try {
    await fs.unlink(contextFilePath)
  } catch {}

  return {
    removed: true,
    appointmentId: appointment.id
  }
}

const parseAppointmentIdFromArgs = () => {
  const arg = process.argv.slice(2).find((item) => item && !item.startsWith('--'))
  if (arg) return arg
  const longArg = process.argv.slice(2).find((item) => item.startsWith('--appointmentId='))
  if (!longArg) return null
  return longArg.split('=')[1] || null
}

const isDirectRun = path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)

if (isDirectRun) {
  teardownHoldLockTestData({ appointmentId: parseAppointmentIdFromArgs() })
    .then((result) => {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
      process.exit(0)
    })
    .catch((error) => {
      process.stderr.write(`HOLD_LOCK_TEST_TEARDOWN_FAIL=${error.message}\n`)
      process.exit(1)
    })
}

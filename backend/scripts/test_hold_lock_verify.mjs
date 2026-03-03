import 'dotenv/config'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { QueryTypes } from 'sequelize'
import { sequelize, Appointment, AuditLog } from '../src/db/models/index.js'
import { logAPath, logBPath, readContext } from './test_hold_lock_common.mjs'

const hasAuditLogTable = async () => {
  const [row] = await sequelize.query(
    'SELECT to_regclass(\'"AuditLog"\') IS NOT NULL AS exists',
    { type: QueryTypes.SELECT }
  )
  return Boolean(row?.exists)
}

const readLogFile = async (filePath) => {
  try {
    return await fs.readFile(filePath, 'utf8')
  } catch {
    return ''
  }
}

const countOccurrences = (content, token) => {
  if (!content) return 0
  return content.split(token).length - 1
}

export const verifyHoldLockSingleInstance = async ({ appointmentId: explicitAppointmentId } = {}) => {
  await sequelize.authenticate()
  const context = await readContext()
  const appointmentId = explicitAppointmentId || context.appointmentId

  if (!appointmentId) {
    throw new Error('No hay appointmentId para verificar. Revisar setup/contexto.')
  }

  const appointment = await Appointment.findByPk(appointmentId, { paranoid: false })
  if (!appointment) {
    throw new Error(`No existe appointment ${appointmentId} para validar la prueba`)
  }

  const currentStatus = String(appointment.status || '').toLowerCase()
  const expectedStatuses = (context.expectedStatuses || ['cancelled', 'expired']).map((item) => String(item).toLowerCase())

  const auditLogExists = await hasAuditLogTable()
  let auditCount = null

  if (auditLogExists) {
    auditCount = await AuditLog.count({
      where: {
        action: 'APPOINTMENT_HOLD_EXPIRED',
        entity: 'Appointment',
        entityId: appointmentId
      }
    })
  }

  const logA = await readLogFile(logAPath)
  const logB = await readLogFile(logBPath)
  const lockNotAcquiredEvents =
    countOccurrences(logA, 'expired-holds-job-lock-not-acquired') +
    countOccurrences(logB, 'expired-holds-job-lock-not-acquired')

  const statusOk = expectedStatuses.includes(currentStatus)
  const auditOk = auditCount === null ? true : auditCount === 1
  const lockEvidenceOk = lockNotAcquiredEvents >= 1

  const pass = statusOk && auditOk && lockEvidenceOk

  const result = {
    pass,
    appointmentId,
    currentStatus,
    expectedStatuses,
    cancelReason: appointment.cancelReason,
    updatedAt: appointment.updatedAt?.toISOString?.() || null,
    checks: {
      statusOk,
      auditOk,
      lockEvidenceOk
    },
    evidence: {
      auditCount,
      lockNotAcquiredEvents,
      logAPath,
      logBPath
    }
  }

  return result
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
  verifyHoldLockSingleInstance({ appointmentId: parseAppointmentIdFromArgs() })
    .then((result) => {
      if (result.pass) {
        process.stdout.write(`HOLD_LOCK_TEST_VERIFY=PASS\n${JSON.stringify(result, null, 2)}\n`)
        process.exit(0)
      }

      process.stderr.write(`HOLD_LOCK_TEST_VERIFY=FAIL\n${JSON.stringify(result, null, 2)}\n`)
      process.stderr.write(`Revisar logs en: ${result.evidence.logAPath} y ${result.evidence.logBPath}\n`)
      process.exit(1)
    })
    .catch((error) => {
      process.stderr.write(`HOLD_LOCK_TEST_VERIFY_FAIL=${error.message}\n`)
      process.stderr.write(`Revisar logs en: ${logAPath} y ${logBPath}\n`)
      process.exit(1)
    })
}

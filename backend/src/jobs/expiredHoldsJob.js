import { Op, QueryTypes } from 'sequelize'
import { config } from '../config/env.js'
import { logger } from '../config/logger.js'
import { Appointment, AuditLog, sequelize } from '../db/models/index.js'

let intervalHandle = null
let isRunning = false
let lastLockMissLogAt = 0

const LOCK_MISS_LOG_THROTTLE_MS = 5 * 60 * 1000
export const EXPIRED_HOLDS_ADVISORY_LOCK_KEY = '738194776523945381'

const defaultDependencies = {
  sequelize,
  Appointment,
  AuditLog,
  logger,
  holdMinutes: config.APPOINTMENT_HOLD_MINUTES,
  lockKey: EXPIRED_HOLDS_ADVISORY_LOCK_KEY,
  now: () => Date.now()
}

const tryAcquireAdvisoryLock = async ({ sequelize, transaction, lockKey }) => {
  const [row] = await sequelize.query(
    'SELECT pg_try_advisory_lock(CAST(:lockKey AS bigint)) AS acquired',
    {
      type: QueryTypes.SELECT,
      transaction,
      replacements: { lockKey }
    }
  )

  return Boolean(row?.acquired)
}

const releaseAdvisoryLock = async ({ sequelize, transaction, lockKey }) => {
  const [row] = await sequelize.query(
    'SELECT pg_advisory_unlock(CAST(:lockKey AS bigint)) AS released',
    {
      type: QueryTypes.SELECT,
      transaction,
      replacements: { lockKey }
    }
  )

  return Boolean(row?.released)
}

export const runExpiredHoldsBatch = async (customDependencies = {}) => {
  const dependencies = {
    ...defaultDependencies,
    ...customDependencies
  }

  if (isRunning) {
    return { released: 0, skipped: 'already_running' }
  }

  isRunning = true
  const threshold = new Date(dependencies.now() - (dependencies.holdMinutes * 60 * 1000))

  try {
    const result = await dependencies.sequelize.transaction(async (transaction) => {
      const lockAcquired = await tryAcquireAdvisoryLock({
        sequelize: dependencies.sequelize,
        transaction,
        lockKey: dependencies.lockKey
      })

      if (!lockAcquired) {
        const now = dependencies.now()
        if (now - lastLockMissLogAt >= LOCK_MISS_LOG_THROTTLE_MS) {
          dependencies.logger.info(
            { lockKey: dependencies.lockKey },
            'expired-holds-job-lock-not-acquired'
          )
          lastLockMissLogAt = now
        }

        return {
          released: 0,
          skipped: 'lock_not_acquired'
        }
      }

      let releasedCount = 0
      let releasedRows = []
      try {
        [releasedCount, releasedRows] = await dependencies.Appointment.update(
          {
            status: 'cancelled',
            cancelReason: 'hold_expired'
          },
          {
            where: {
              status: 'hold',
              createdAt: {
                [Op.lt]: threshold
              }
            },
            returning: ['id', 'doctorId', 'patientId', 'date', 'startTime', 'createdAt'],
            transaction
          }
        )

        if (releasedCount > 0) {
          try {
            await dependencies.AuditLog.bulkCreate(
              releasedRows.map((item) => ({
                actorRole: 'system',
                actorId: null,
                action: 'APPOINTMENT_HOLD_EXPIRED',
                entity: 'Appointment',
                entityId: item.id,
                meta: {
                  doctorId: item.doctorId,
                  patientId: item.patientId,
                  date: item.date,
                  startTime: item.startTime,
                  createdAt: item.createdAt,
                  threshold
                }
              })),
              { transaction }
            )
          } catch (error) {
            if (error?.parent?.code === '42P01') {
              dependencies.logger.warn('audit-log-table-missing-for-expired-holds')
            } else {
              throw error
            }
          }
        }

        return {
          released: releasedCount,
          skipped: null
        }
      } finally {
        const lockReleased = await releaseAdvisoryLock({
          sequelize: dependencies.sequelize,
          transaction,
          lockKey: dependencies.lockKey
        })

        if (!lockReleased) {
          dependencies.logger.warn(
            { lockKey: dependencies.lockKey },
            'expired-holds-job-lock-release-failed'
          )
        }
      }
    })

    if (result.skipped !== 'lock_not_acquired') {
      dependencies.logger.info(
        {
          released: result.released,
          holdTtlMinutes: dependencies.holdMinutes
        },
        'expired-holds-job-finished'
      )
    }

    return result
  } catch (error) {
    dependencies.logger.error({ err: error }, 'expired-holds-job-failed')
    return { released: 0, error: error.message }
  } finally {
    isRunning = false
  }
}

export const startExpiredHoldsJob = () => {
  if (intervalHandle) {
    return
  }

  const intervalMinutes = config.HOLD_EXPIRATION_JOB_INTERVAL_MINUTES
  const intervalMs = intervalMinutes * 60 * 1000

  intervalHandle = setInterval(() => {
    runExpiredHoldsBatch()
  }, intervalMs)

  runExpiredHoldsBatch()

  logger.info(
    {
      intervalMinutes,
      holdTtlMinutes: config.APPOINTMENT_HOLD_MINUTES
    },
    'expired-holds-job-started'
  )
}

export const stopExpiredHoldsJob = () => {
  if (!intervalHandle) {
    return
  }
  clearInterval(intervalHandle)
  intervalHandle = null
  logger.info('expired-holds-job-stopped')
}

export const __resetExpiredHoldsJobStateForTests = () => {
  if (intervalHandle) {
    clearInterval(intervalHandle)
  }
  intervalHandle = null
  isRunning = false
  lastLockMissLogAt = 0
}

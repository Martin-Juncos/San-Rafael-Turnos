import { sequelize } from '../config/database.js'
import { logger } from '../config/logger.js'
import '../db/models/index.js'
import { getSqlMigrationStatus } from './migrationRunner.js'

const formatList = (items) => {
  if (items.length === 0) {
    return '  - (ninguna)'
  }
  return items.map((item) => `  - ${item}`).join('\n')
}

const run = async () => {
  try {
    await sequelize.authenticate()
    const status = await getSqlMigrationStatus()

    process.stdout.write(`Schema: ${status.schema}\n`)
    process.stdout.write(`Baseline (${status.baseline.migrationName}): ${status.baseline.applied ? 'aplicada' : 'pendiente'}\n`)
    if (status.baseline.inconsistent) {
      process.stdout.write(
        'WARNING: se detectaron tablas sin marca de baseline. Ejecuta db:migrate con control manual.\n'
      )
    }
    process.stdout.write('\nAplicadas:\n')
    process.stdout.write(`${formatList(status.applied)}\n`)
    process.stdout.write('\nPendientes:\n')
    process.stdout.write(`${formatList(status.pending)}\n`)

    if (status.unknownApplied.length > 0) {
      process.stdout.write('\nAplicadas sin archivo local:\n')
      process.stdout.write(`${formatList(status.unknownApplied)}\n`)
    }

    process.exit(0)
  } catch (error) {
    logger.error({ err: error }, 'Error obteniendo estado de migraciones')
    process.exit(1)
  }
}

run()

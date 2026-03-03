import { sequelize } from '../config/database.js'
import { logger } from '../config/logger.js'
import '../db/models/index.js'
import { rollbackLastSqlMigration } from './migrationRunner.js'

const run = async () => {
  try {
    await sequelize.authenticate()
    const result = await rollbackLastSqlMigration()
    logger.info({ result }, 'Rollback de migracion SQL completado')
    process.exit(0)
  } catch (error) {
    logger.error({ err: error }, 'Error en rollback de migracion')
    process.exit(1)
  }
}

run()

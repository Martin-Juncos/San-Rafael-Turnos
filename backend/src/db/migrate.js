import { sequelize } from '../config/database.js'
import { logger } from '../config/logger.js'
import '../db/models/index.js'
import { ensureHealthInsuranceUniquenessRule } from './healthInsuranceConstraints.js'

const run = async () => {
  try {
    await sequelize.authenticate()
    await sequelize.sync({ alter: true })
    await ensureHealthInsuranceUniquenessRule(sequelize)
    await sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS appointment_unique_active_slot
      ON "Appointment" ("doctorId", "date", "startTime")
      WHERE status IN ('hold', 'confirmed');
    `)
    logger.info('Migraciones aplicadas correctamente')
    process.exit(0)
  } catch (error) {
    logger.error({ err: error }, 'Error en migracion')
    process.exit(1)
  }
}

run()

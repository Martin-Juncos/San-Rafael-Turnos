import { sequelize } from '../config/database.js'
import { logger } from '../config/logger.js'
import '../db/models/index.js'

const run = async () => {
  try {
    await sequelize.authenticate()
    await sequelize.sync({ alter: true })
    await sequelize.query(`
      ALTER TABLE "HealthInsurance"
      DROP CONSTRAINT IF EXISTS "HealthInsurance_name_key";
    `)
    await sequelize.query(`
      DROP INDEX IF EXISTS "healthinsurance_unique_name_discount_active";
    `)
    await sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "healthinsurance_unique_name_discount_active"
      ON "HealthInsurance" (LOWER("name"), "discountPercent")
      WHERE "deletedAt" IS NULL;
    `)
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

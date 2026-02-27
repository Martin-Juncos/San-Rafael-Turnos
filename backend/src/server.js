import './db/models/index.js'
import { app } from './app.js'
import { config } from './config/env.js'
import { logger } from './config/logger.js'
import { sequelize } from './config/database.js'

const start = async () => {
  try {
    await sequelize.authenticate()
    if (config.DB_SYNC) {
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
    }

    app.listen(config.PORT, () => {
      logger.info({ port: config.PORT }, 'backend-started')
    })
  } catch (error) {
    logger.error({ err: error }, 'backend-start-failed')
    process.exit(1)
  }
}

start()

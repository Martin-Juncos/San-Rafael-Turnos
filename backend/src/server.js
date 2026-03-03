import './db/models/index.js'
import { app } from './app.js'
import { logger } from './config/logger.js'
import { sequelize } from './config/database.js'
import { config } from './config/env.js'
import { startExpiredHoldsJob } from './jobs/expiredHoldsJob.js'

const start = async () => {
  try {
    await sequelize.authenticate()
    startExpiredHoldsJob()

    app.listen(config.PORT, () => {
      logger.info({ port: config.PORT }, 'backend-started')
    })
  } catch (error) {
    logger.error({ err: error }, 'backend-start-failed')
    process.exit(1)
  }
}

start()

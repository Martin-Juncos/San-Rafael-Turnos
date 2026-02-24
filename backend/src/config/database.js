import { Sequelize } from 'sequelize'
import { config } from './env.js'
import { logger } from './logger.js'

export const sequelize = new Sequelize(config.DATABASE_URL, {
  dialect: 'postgres',
  logging: config.IS_PROD ? false : (sql) => logger.debug({ sql }, 'sequelize-query'),
  define: {
    freezeTableName: true
  }
})

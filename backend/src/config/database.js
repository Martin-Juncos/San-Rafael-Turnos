import { Sequelize } from 'sequelize'
import { config } from './env.js'
import { logger } from './logger.js'

const searchPathSchema = config.DB_SCHEMA?.trim()
const setSearchPath = Boolean(searchPathSchema)

export const sequelize = new Sequelize(config.DATABASE_URL, {
  dialect: 'postgres',
  logging: config.NODE_ENV === 'development'
    ? (sql) => logger.debug({ sql }, 'sequelize-query')
    : false,
  define: {
    freezeTableName: true
  },
  hooks: setSearchPath
    ? {
        afterConnect: async (connection) => {
          await connection.query(`SET search_path TO "${searchPathSchema}", public;`)
        }
      }
    : undefined,
  dialectOptions: setSearchPath
    ? {
        options: `-c search_path=${searchPathSchema},public`
      }
    : undefined
})

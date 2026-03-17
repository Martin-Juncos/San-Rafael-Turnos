import '../db/models/index.js'
import { sequelize } from '../config/database.js'
import { logger } from '../config/logger.js'
import { runSeed } from '../seed/seed.js'

const RESET_MODES = {
  operational: {
    description: 'Limpia pacientes, turnos, pagos, mensajes, notas y auditoria de prueba',
    tables: [
      'PaymentWebhookEvent',
      'Payment',
      'Message',
      'ConsultNote',
      'Appointment',
      'DoctorBlock',
      'RefreshToken',
      'AuditLog',
      'Patient'
    ],
    reseed: false
  },
  demo: {
    description: 'Limpia todos los datos operativos y catalogos, luego reaplica el seed minimo',
    tables: [
      'PaymentWebhookEvent',
      'Payment',
      'Message',
      'ConsultNote',
      'Appointment',
      'DoctorBlock',
      'DoctorAvailability',
      'RefreshToken',
      'AuditLog',
      'Patient',
      'User',
      'Doctor',
      'HealthInsurance',
      'Specialty'
    ],
    reseed: true
  }
}

const parseMode = () => {
  const requestedMode = process.argv[2]?.trim().toLowerCase() || 'operational'
  const mode = RESET_MODES[requestedMode]
  if (!mode) {
    const allowedModes = Object.keys(RESET_MODES).join(', ')
    throw new Error(`Modo invalido "${requestedMode}". Modos soportados: ${allowedModes}`)
  }
  return {
    requestedMode,
    ...mode
  }
}

const truncateTables = async (tables) => {
  const sql = `TRUNCATE TABLE ${tables.map((table) => `"${table}"`).join(', ')} RESTART IDENTITY CASCADE;`
  await sequelize.transaction(async (transaction) => {
    await sequelize.query(sql, { transaction })
  })
}

const run = async () => {
  const mode = parseMode()

  try {
    await sequelize.authenticate()

    logger.warn(
      {
        mode: mode.requestedMode,
        tables: mode.tables
      },
      'db-reset-start'
    )

    await truncateTables(mode.tables)

    if (mode.reseed) {
      await runSeed()
    }

    logger.info(
      {
        mode: mode.requestedMode,
        reseeded: mode.reseed
      },
      'db-reset-finished'
    )
    process.exit(0)
  } catch (error) {
    logger.error(
      {
        err: error,
        mode: mode.requestedMode,
        description: mode.description
      },
      'db-reset-error'
    )
    process.exit(1)
  }
}

run()

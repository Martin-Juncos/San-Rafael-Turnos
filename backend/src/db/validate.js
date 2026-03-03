import { QueryTypes } from 'sequelize'
import { sequelize } from '../config/database.js'
import { logger } from '../config/logger.js'
import '../db/models/index.js'

const REQUIRED_TABLES = [
  'Appointment',
  'Doctor',
  'Patient',
  'Payment',
  'User',
  'Specialty'
]

const REQUIRED_COLUMNS_BY_TABLE = {
  Appointment: ['status', 'createdAt', 'updatedAt', 'doctorId', 'patientId', 'specialtyId'],
  Doctor: ['createdAt', 'updatedAt', 'specialtyId'],
  Patient: ['createdAt', 'updatedAt', 'dni'],
  Payment: ['status', 'appointmentId', 'createdAt', 'updatedAt'],
  User: ['role', 'email', 'createdAt', 'updatedAt'],
  Specialty: ['name', 'createdAt', 'updatedAt']
}

const REQUIRED_FKS = [
  { table: 'Appointment', column: 'doctorId', foreignTable: 'Doctor' },
  { table: 'Appointment', column: 'patientId', foreignTable: 'Patient' },
  { table: 'Appointment', column: 'specialtyId', foreignTable: 'Specialty' },
  { table: 'Payment', column: 'appointmentId', foreignTable: 'Appointment' }
]

const run = async () => {
  try {
    await sequelize.authenticate()

    const [schemaRow] = await sequelize.query(
      'SELECT current_schema() AS schema_name;',
      { type: QueryTypes.SELECT }
    )
    const schemaName = schemaRow?.schema_name || 'public'

    const tableRows = await sequelize.query(
      `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = current_schema()
          AND table_type = 'BASE TABLE';
      `,
      { type: QueryTypes.SELECT }
    )
    const existingTables = new Set(tableRows.map((row) => row.table_name))
    const missingTables = REQUIRED_TABLES.filter((tableName) => !existingTables.has(tableName))

    const columnRows = await sequelize.query(
      `
        SELECT table_name, column_name
        FROM information_schema.columns
        WHERE table_schema = current_schema();
      `,
      { type: QueryTypes.SELECT }
    )
    const columnsByTable = columnRows.reduce((acc, row) => {
      const key = row.table_name
      if (!acc[key]) {
        acc[key] = new Set()
      }
      acc[key].add(row.column_name)
      return acc
    }, {})

    const missingColumns = []
    for (const [tableName, requiredColumns] of Object.entries(REQUIRED_COLUMNS_BY_TABLE)) {
      for (const columnName of requiredColumns) {
        if (!columnsByTable[tableName]?.has(columnName)) {
          missingColumns.push(`${tableName}.${columnName}`)
        }
      }
    }

    const fkRows = await sequelize.query(
      `
        SELECT
          tc.table_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage ccu
          ON tc.constraint_name = ccu.constraint_name
         AND tc.table_schema = ccu.table_schema
        WHERE tc.table_schema = current_schema()
          AND tc.constraint_type = 'FOREIGN KEY';
      `,
      { type: QueryTypes.SELECT }
    )

    const fkSignatures = new Set(
      fkRows.map((row) => `${row.table_name}.${row.column_name}->${row.foreign_table_name}`)
    )

    const missingFks = REQUIRED_FKS
      .map((fk) => `${fk.table}.${fk.column}->${fk.foreignTable}`)
      .filter((signature) => !fkSignatures.has(signature))

    if (missingTables.length > 0 || missingColumns.length > 0 || missingFks.length > 0) {
      process.stderr.write(`db:validate failed for schema "${schemaName}"\n`)
      if (missingTables.length > 0) {
        process.stderr.write(`Missing tables: ${missingTables.join(', ')}\n`)
      }
      if (missingColumns.length > 0) {
        process.stderr.write(`Missing columns: ${missingColumns.join(', ')}\n`)
      }
      if (missingFks.length > 0) {
        process.stderr.write(`Missing foreign keys: ${missingFks.join(', ')}\n`)
      }
      process.exit(1)
    }

    process.stdout.write(`db:validate ok for schema "${schemaName}"\n`)
    process.exit(0)
  } catch (error) {
    logger.error({ err: error }, 'Error validando esquema de DB')
    process.exit(1)
  }
}

run()

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { QueryTypes } from 'sequelize'
import { sequelize } from '../config/database.js'
import { config } from '../config/env.js'
import { logger } from '../config/logger.js'

const dbDir = path.dirname(fileURLToPath(import.meta.url))
const migrationsDir = path.join(dbDir, 'migrations')
const schemaName = config.DB_SCHEMA?.trim()
const BASELINE_MIGRATION_NAME = '000_initial_schema'

const ensureSearchPath = async () => {
  if (!schemaName) {
    return
  }
  await sequelize.query(`SET search_path TO "${schemaName}", public;`)
}

const ensureMigrationsTable = async () => {
  await ensureSearchPath()
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      migration_name TEXT PRIMARY KEY,
      up_file TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)
}

const insertMigrationRecord = async ({ migrationName, upFile, transaction }) => {
  await sequelize.query(
    `
      INSERT INTO schema_migrations (migration_name, up_file, applied_at)
      VALUES (:migrationName, :upFile, NOW());
    `,
    {
      transaction,
      replacements: {
        migrationName,
        upFile
      }
    }
  )
}

const getAppliedMigrationRows = async () => {
  const rows = await sequelize.query(
    `
      SELECT migration_name, up_file, applied_at
      FROM schema_migrations
      ORDER BY applied_at ASC, migration_name ASC;
    `,
    { type: QueryTypes.SELECT }
  )
  return rows
}

const hasBusinessTables = async () => {
  const [result] = await sequelize.query(
    `
      SELECT EXISTS (
        SELECT 1
        FROM pg_tables
        WHERE schemaname = current_schema()
          AND tablename <> 'schema_migrations'
      ) AS has_existing_tables;
    `,
    { type: QueryTypes.SELECT }
  )

  return Boolean(result?.has_existing_tables)
}

const getCurrentSchema = async () => {
  const [row] = await sequelize.query(
    'SELECT current_schema() AS schema_name;',
    { type: QueryTypes.SELECT }
  )
  return row?.schema_name || 'public'
}

const ensureBaselineConsistency = async ({ appliedSet, migrations }) => {
  const baselineMigration = migrations.find((migration) => migration.migrationName === BASELINE_MIGRATION_NAME)
  if (!baselineMigration) {
    return {
      baselineMigration: null,
      baselineState: 'missing_file',
      assumedApplied: false
    }
  }

  if (appliedSet.has(BASELINE_MIGRATION_NAME)) {
    return {
      baselineMigration,
      baselineState: 'applied',
      assumedApplied: false
    }
  }

  const existingTables = await hasBusinessTables()
  if (!existingTables) {
    return {
      baselineMigration,
      baselineState: 'pending_fresh_schema',
      assumedApplied: false
    }
  }

  if (config.DB_BASELINE_ASSUME_APPLIED) {
    await insertMigrationRecord({
      migrationName: baselineMigration.migrationName,
      upFile: baselineMigration.upFile
    })
    appliedSet.add(BASELINE_MIGRATION_NAME)
    logger.warn(
      { migration: BASELINE_MIGRATION_NAME, schema: await getCurrentSchema() },
      'baseline-assumed-applied'
    )
    return {
      baselineMigration,
      baselineState: 'assumed_applied',
      assumedApplied: true
    }
  }

  throw new Error(
    [
      `Schema inconsistente: existen tablas en ${await getCurrentSchema()} sin marca de baseline (${BASELINE_MIGRATION_NAME}) en schema_migrations.`,
      'Para proteger el esquema, la migracion se detuvo.',
      'Opciones:',
      '1) Ejecutar baseline en un schema vacio.',
      '2) Si confirmas manualmente que el baseline ya esta representado, correr: DB_BASELINE_ASSUME_APPLIED=true npm run db:migrate'
    ].join(' ')
  )
}

const resolveMigrationRecord = (fileName) => {
  if (fileName.endsWith('_down.sql')) {
    return null
  }
  if (fileName.endsWith('_up.sql')) {
    return {
      migrationName: fileName.slice(0, -'_up.sql'.length),
      upFile: fileName
    }
  }
  if (fileName.endsWith('.sql')) {
    return {
      migrationName: fileName.slice(0, -'.sql'.length),
      upFile: fileName
    }
  }
  return null
}

const listUpMigrations = async () => {
  const entries = await fs.readdir(migrationsDir, { withFileTypes: true })
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => resolveMigrationRecord(entry.name))
    .filter(Boolean)
    .sort((a, b) => {
      const nameCompare = a.migrationName.localeCompare(b.migrationName)
      if (nameCompare !== 0) return nameCompare
      return a.upFile.localeCompare(b.upFile)
    })
}

export const applySqlMigrations = async () => {
  await ensureMigrationsTable()

  const appliedRows = await getAppliedMigrationRows()
  const appliedSet = new Set(appliedRows.map((row) => row.migration_name))
  const migrations = await listUpMigrations()
  const appliedNow = []
  const skipped = []
  const consistency = await ensureBaselineConsistency({ appliedSet, migrations })

  for (const migration of migrations) {
    if (appliedSet.has(migration.migrationName)) {
      skipped.push(migration.migrationName)
      continue
    }

    const filePath = path.join(migrationsDir, migration.upFile)
    const sql = await fs.readFile(filePath, 'utf8')

    await sequelize.transaction(async (transaction) => {
      await sequelize.query(sql, { transaction })
      await insertMigrationRecord({
        migrationName: migration.migrationName,
        upFile: migration.upFile,
        transaction
      })
    })

    appliedNow.push(migration.migrationName)
    logger.info({ migration: migration.migrationName }, 'migration-applied')
  }

  return {
    applied: appliedNow,
    skipped,
    baselineState: consistency.baselineState
  }
}

export const getSqlMigrationStatus = async () => {
  await ensureMigrationsTable()

  const schema = await getCurrentSchema()
  const migrations = await listUpMigrations()
  const appliedRows = await getAppliedMigrationRows()
  const appliedSet = new Set(appliedRows.map((row) => row.migration_name))
  const existingTables = await hasBusinessTables()

  const applied = migrations
    .filter((migration) => appliedSet.has(migration.migrationName))
    .map((migration) => migration.migrationName)

  const pending = migrations
    .filter((migration) => !appliedSet.has(migration.migrationName))
    .map((migration) => migration.migrationName)

  const unknownApplied = appliedRows
    .filter((row) => !migrations.some((migration) => migration.migrationName === row.migration_name))
    .map((row) => row.migration_name)

  const hasBaselineFile = migrations.some((migration) => migration.migrationName === BASELINE_MIGRATION_NAME)
  const baselineApplied = appliedSet.has(BASELINE_MIGRATION_NAME)
  const baselineInconsistent = hasBaselineFile && existingTables && !baselineApplied

  return {
    schema,
    applied,
    pending,
    unknownApplied,
    baseline: {
      migrationName: BASELINE_MIGRATION_NAME,
      hasFile: hasBaselineFile,
      applied: baselineApplied,
      inconsistent: baselineInconsistent
    }
  }
}

export const rollbackLastSqlMigration = async () => {
  await ensureMigrationsTable()

  const [lastApplied] = await sequelize.query(
    `
      SELECT migration_name, up_file, applied_at
      FROM schema_migrations
      ORDER BY applied_at DESC, migration_name DESC
      LIMIT 1;
    `,
    { type: QueryTypes.SELECT }
  )

  if (!lastApplied) {
    return {
      rolledBack: null,
      reason: 'no_migrations_applied'
    }
  }

  const downFileName = `${lastApplied.migration_name}_down.sql`
  const downFilePath = path.join(migrationsDir, downFileName)

  try {
    await fs.access(downFilePath)
  } catch {
    throw new Error(
      `No existe migracion DOWN para "${lastApplied.migration_name}". Esperada: ${downFileName}`
    )
  }

  const downSql = await fs.readFile(downFilePath, 'utf8')

  await sequelize.transaction(async (transaction) => {
    await sequelize.query(downSql, { transaction })
    await sequelize.query(
      `
        DELETE FROM schema_migrations
        WHERE migration_name = :migrationName;
      `,
      {
        transaction,
        replacements: {
          migrationName: lastApplied.migration_name
        }
      }
    )
  })

  logger.info({ migration: lastApplied.migration_name }, 'migration-rolled-back')

  return {
    rolledBack: lastApplied.migration_name
  }
}

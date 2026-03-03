import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { QueryTypes } from 'sequelize'
import { sequelize } from '../config/database.js'
import { logger } from '../config/logger.js'

const dbDir = path.dirname(fileURLToPath(import.meta.url))
const migrationsDir = path.join(dbDir, 'migrations')

const ensureMigrationsTable = async () => {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      migration_name TEXT PRIMARY KEY,
      up_file TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)
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

  const appliedRows = await sequelize.query(
    'SELECT migration_name FROM schema_migrations',
    { type: QueryTypes.SELECT }
  )
  const appliedSet = new Set(appliedRows.map((row) => row.migration_name))
  const migrations = await listUpMigrations()
  const appliedNow = []
  const skipped = []

  for (const migration of migrations) {
    if (appliedSet.has(migration.migrationName)) {
      skipped.push(migration.migrationName)
      continue
    }

    const filePath = path.join(migrationsDir, migration.upFile)
    const sql = await fs.readFile(filePath, 'utf8')

    await sequelize.transaction(async (transaction) => {
      await sequelize.query(sql, { transaction })
      await sequelize.query(
        `
          INSERT INTO schema_migrations (migration_name, up_file, applied_at)
          VALUES (:migrationName, :upFile, NOW());
        `,
        {
          transaction,
          replacements: {
            migrationName: migration.migrationName,
            upFile: migration.upFile
          }
        }
      )
    })

    appliedNow.push(migration.migrationName)
    logger.info({ migration: migration.migrationName }, 'migration-applied')
  }

  return {
    applied: appliedNow,
    skipped
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

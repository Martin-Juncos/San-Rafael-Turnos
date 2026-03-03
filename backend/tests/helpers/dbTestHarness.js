import crypto from 'node:crypto'
import pg from 'pg'

const { Client } = pg

const DEFAULT_TEST_JWT_ACCESS_SECRET = 'test_access_secret_1234567890'
const DEFAULT_TEST_JWT_REFRESH_SECRET = 'test_refresh_secret_1234567890'

const escapeIdentifier = (value) => `"${String(value).replaceAll('"', '""')}"`

const parseDatabaseName = (databaseUrl) => {
  const parsed = new URL(databaseUrl)
  return parsed.pathname.replace(/^\//, '')
}

const assertSafeTestDatabaseUrl = (databaseUrl) => {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL_TEST es requerido para tests de integracion')
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('Los tests de integracion no pueden ejecutarse en NODE_ENV=production')
  }

  const databaseName = parseDatabaseName(databaseUrl)
  if (!/test/i.test(databaseName)) {
    throw new Error(
      `DATABASE_URL_TEST inseguro: la base "${databaseName}" debe incluir "test" en el nombre`
    )
  }
}

const buildSchemaName = () => {
  const timestamp = Date.now()
  const random = crypto.randomBytes(3).toString('hex')
  return `test_${timestamp}_${random}`
}

export const createDbTestHarness = () => {
  const state = {
    testDatabaseUrl: '',
    schema: '',
    adminClient: null,
    sequelize: null,
    app: null,
    models: null
  }

  const ensureTestEnvironmentVariables = () => {
    process.env.NODE_ENV = 'test'
    process.env.DATABASE_URL = state.testDatabaseUrl
    process.env.DB_SCHEMA = state.schema
    process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || DEFAULT_TEST_JWT_ACCESS_SECRET
    process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || DEFAULT_TEST_JWT_REFRESH_SECRET
  }

  const connectAdminClient = async () => {
    state.adminClient = new Client({
      connectionString: state.testDatabaseUrl
    })
    await state.adminClient.connect()
  }

  const createTestSchema = async () => {
    await state.adminClient.query(`CREATE SCHEMA IF NOT EXISTS ${escapeIdentifier(state.schema)};`)
  }

  const loadRuntimeModules = async () => {
    const databaseModule = await import('../../src/config/database.js')
    const migrationsModule = await import('../../src/db/migrationRunner.js')

    state.sequelize = databaseModule.sequelize

    await state.sequelize.authenticate()
    await migrationsModule.applySqlMigrations()

    const modelsModule = await import('../../src/db/models/index.js')
    const appModule = await import('../../src/app.js')

    state.models = modelsModule
    state.app = appModule.app
  }

  const migrateSchema = async () => {
    if (!state.sequelize) {
      throw new Error('sequelize no inicializado en test harness')
    }
    const migrationsModule = await import('../../src/db/migrationRunner.js')
    await migrationsModule.applySqlMigrations()
  }

  const truncateAll = async () => {
    const { rows } = await state.adminClient.query(
      `
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = $1
          AND tablename <> 'schema_migrations'
        ORDER BY tablename;
      `,
      [state.schema]
    )

    if (rows.length === 0) {
      return
    }

    const targets = rows
      .map((row) => `${escapeIdentifier(state.schema)}.${escapeIdentifier(row.tablename)}`)
      .join(', ')

    await state.adminClient.query(`TRUNCATE TABLE ${targets} RESTART IDENTITY CASCADE;`)
  }

  const dropTestSchema = async () => {
    if (!state.adminClient || !state.schema) {
      return
    }
    await state.adminClient.query(`DROP SCHEMA IF EXISTS ${escapeIdentifier(state.schema)} CASCADE;`)
  }

  const setup = async () => {
    state.testDatabaseUrl = process.env.DATABASE_URL_TEST || ''
    assertSafeTestDatabaseUrl(state.testDatabaseUrl)
    state.schema = buildSchemaName()

    await connectAdminClient()
    await createTestSchema()
    ensureTestEnvironmentVariables()
    await loadRuntimeModules()

    return {
      schema: state.schema,
      app: state.app,
      sequelize: state.sequelize,
      models: state.models
    }
  }

  const teardown = async () => {
    if (state.sequelize) {
      await state.sequelize.close()
      state.sequelize = null
    }
    await dropTestSchema()
    if (state.adminClient) {
      await state.adminClient.end()
      state.adminClient = null
    }
  }

  return {
    setup,
    teardown,
    createTestSchema,
    migrateSchema,
    truncateAll,
    dropTestSchema,
    getState: () => ({
      schema: state.schema,
      app: state.app,
      sequelize: state.sequelize,
      models: state.models
    })
  }
}

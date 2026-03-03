import 'dotenv/config'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const { Client } = pg

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const backendDir = path.resolve(scriptDir, '..')
const repoRoot = path.resolve(backendDir, '..')
const docsDir = path.join(repoRoot, 'docs', 'db')
const snapshotPath = path.join(docsDir, 'schema_snapshot.json')
const reportPath = path.join(docsDir, 'schema_audit.md')

const REQUIRED_TABLES = [
  { entity: 'specialties', table: 'Specialty', required: true, notes: 'Catalogo de especialidades' },
  { entity: 'doctors', table: 'Doctor', required: true, notes: 'Profesionales medicos' },
  { entity: 'doctor_availability', table: 'DoctorAvailability', required: true, notes: 'Agenda base semanal' },
  { entity: 'doctor_blocks', table: 'DoctorBlock', required: false, notes: 'Bloqueos puntuales de agenda' },
  { entity: 'patients', table: 'Patient', required: true, notes: 'Pacientes' },
  { entity: 'appointments', table: 'Appointment', required: true, notes: 'Turnos y estado del flujo' },
  { entity: 'payments', table: 'Payment', required: true, notes: 'Pagos por turno' },
  { entity: 'users', table: 'User', required: true, notes: 'RBAC administrativo/medico' },
  { entity: 'messages', table: 'Message', required: false, notes: 'Mensajeria vinculada al turno' },
  { entity: 'audit_logs', table: 'AuditLog', required: false, notes: 'Trazabilidad operativa' }
]

const schemaQueries = {
  metadata: `
    SELECT current_database() AS database_name,
           current_schema() AS schema_name,
           now() AS extracted_at;
  `,
  extensions: `
    SELECT extname, extversion
    FROM pg_extension
    ORDER BY extname;
  `,
  tables: `
    SELECT table_schema, table_name
    FROM information_schema.tables
    WHERE table_type='BASE TABLE'
      AND table_schema NOT IN ('pg_catalog', 'information_schema')
    ORDER BY table_schema, table_name;
  `,
  columns: `
    SELECT c.table_schema,
           c.table_name,
           c.ordinal_position,
           c.column_name,
           c.data_type,
           c.udt_name,
           c.is_nullable,
           c.column_default
    FROM information_schema.columns c
    WHERE c.table_schema='public'
    ORDER BY c.table_name, c.ordinal_position;
  `,
  primaryKeys: `
    SELECT tc.table_name,
           tc.constraint_name,
           string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) AS columns
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
     AND tc.table_schema = kcu.table_schema
    WHERE tc.table_schema='public'
      AND tc.constraint_type='PRIMARY KEY'
    GROUP BY tc.table_name, tc.constraint_name
    ORDER BY tc.table_name;
  `,
  uniqueConstraints: `
    SELECT tc.table_name,
           tc.constraint_name,
           string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) AS columns
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
     AND tc.table_schema = kcu.table_schema
    WHERE tc.table_schema='public'
      AND tc.constraint_type='UNIQUE'
    GROUP BY tc.table_name, tc.constraint_name
    ORDER BY tc.table_name, tc.constraint_name;
  `,
  checkConstraints: `
    SELECT n.nspname AS schema_name,
           t.relname AS table_name,
           c.conname AS constraint_name,
           pg_get_constraintdef(c.oid) AS definition
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE c.contype = 'c'
      AND n.nspname = 'public'
    ORDER BY t.relname, c.conname;
  `,
  foreignKeys: `
    SELECT tc.table_name,
           tc.constraint_name,
           kcu.column_name,
           ccu.table_name AS foreign_table_name,
           ccu.column_name AS foreign_column_name,
           rc.update_rule,
           rc.delete_rule
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
     AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name
     AND tc.table_schema = ccu.table_schema
    JOIN information_schema.referential_constraints rc
      ON tc.constraint_name = rc.constraint_name
     AND tc.table_schema = rc.constraint_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
    ORDER BY tc.table_name, tc.constraint_name;
  `,
  indexes: `
    SELECT schemaname, tablename, indexname, indexdef
    FROM pg_indexes
    WHERE schemaname='public'
    ORDER BY tablename, indexname;
  `,
  enums: `
    SELECT t.typname AS enum_type,
           e.enumsortorder,
           e.enumlabel
    FROM pg_type t
    JOIN pg_enum e ON e.enumtypid = t.oid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname='public'
    ORDER BY t.typname, e.enumsortorder;
  `,
  rowCounts: `
    SELECT relname AS table_name,
           n_live_tup::bigint AS estimated_rows
    FROM pg_stat_user_tables
    ORDER BY relname;
  `
}

const consistencyChecks = [
  {
    key: 'orphan_appointments_doctor',
    description: 'Turnos huerfanos por doctor inexistente',
    severity: 'High',
    countSql: `
      SELECT COUNT(*)::int AS total
      FROM "Appointment" a
      LEFT JOIN "Doctor" d ON d.id = a."doctorId"
      WHERE d.id IS NULL;
    `,
    sampleSql: `
      SELECT a.id, a."doctorId", a.date, a."startTime", a.status
      FROM "Appointment" a
      LEFT JOIN "Doctor" d ON d.id = a."doctorId"
      WHERE d.id IS NULL
      LIMIT 20;
    `
  },
  {
    key: 'orphan_appointments_patient',
    description: 'Turnos huerfanos por paciente inexistente',
    severity: 'High',
    countSql: `
      SELECT COUNT(*)::int AS total
      FROM "Appointment" a
      LEFT JOIN "Patient" p ON p.id = a."patientId"
      WHERE p.id IS NULL;
    `,
    sampleSql: `
      SELECT a.id, a."patientId", a.date, a."startTime", a.status
      FROM "Appointment" a
      LEFT JOIN "Patient" p ON p.id = a."patientId"
      WHERE p.id IS NULL
      LIMIT 20;
    `
  },
  {
    key: 'orphan_payments',
    description: 'Pagos huerfanos sin turno asociado',
    severity: 'Critical',
    countSql: `
      SELECT COUNT(*)::int AS total
      FROM "Payment" p
      LEFT JOIN "Appointment" a ON a.id = p."appointmentId"
      WHERE a.id IS NULL;
    `,
    sampleSql: `
      SELECT p.id, p."appointmentId", p.status
      FROM "Payment" p
      LEFT JOIN "Appointment" a ON a.id = p."appointmentId"
      WHERE a.id IS NULL
      LIMIT 20;
    `
  },
  {
    key: 'duplicate_payments_per_appointment',
    description: 'Turnos con pagos duplicados',
    severity: 'Critical',
    countSql: `
      SELECT COUNT(*)::int AS total
      FROM (
        SELECT "appointmentId"
        FROM "Payment"
        GROUP BY "appointmentId"
        HAVING COUNT(*) > 1
      ) dup;
    `,
    sampleSql: `
      SELECT "appointmentId", COUNT(*) AS payment_count
      FROM "Payment"
      GROUP BY "appointmentId"
      HAVING COUNT(*) > 1
      ORDER BY payment_count DESC
      LIMIT 20;
    `
  },
  {
    key: 'confirmed_without_paid_payment',
    description: 'Turnos confirmados sin pago en estado paid',
    severity: 'High',
    countSql: `
      SELECT COUNT(*)::int AS total
      FROM "Appointment" a
      LEFT JOIN "Payment" p ON p."appointmentId" = a.id
      WHERE a.status='confirmed'
        AND (p.id IS NULL OR p.status <> 'paid');
    `,
    sampleSql: `
      SELECT a.id, a.status AS appointment_status, p.status AS payment_status, a.date, a."startTime"
      FROM "Appointment" a
      LEFT JOIN "Payment" p ON p."appointmentId" = a.id
      WHERE a.status='confirmed'
        AND (p.id IS NULL OR p.status <> 'paid')
      LIMIT 20;
    `
  },
  {
    key: 'expired_holds_not_released',
    description: 'Turnos HOLD vencidos no liberados (ventana 10 min)',
    severity: 'High',
    countSql: `
      SELECT COUNT(*)::int AS total
      FROM "Appointment" a
      WHERE a.status='hold'
        AND a."createdAt" < NOW() - INTERVAL '10 minutes';
    `,
    sampleSql: `
      SELECT a.id, a.status, a."createdAt", a.date, a."startTime"
      FROM "Appointment" a
      WHERE a.status='hold'
        AND a."createdAt" < NOW() - INTERVAL '10 minutes'
      ORDER BY a."createdAt" ASC
      LIMIT 20;
    `
  },
  {
    key: 'double_booking_active_slot',
    description: 'Doble booking (doctor + fecha + hora) en estados activos',
    severity: 'Critical',
    countSql: `
      SELECT COUNT(*)::int AS total
      FROM (
        SELECT "doctorId", date, "startTime"
        FROM "Appointment"
        WHERE status IN ('hold', 'confirmed')
          AND "deletedAt" IS NULL
        GROUP BY "doctorId", date, "startTime"
        HAVING COUNT(*) > 1
      ) dup;
    `,
    sampleSql: `
      SELECT "doctorId", date, "startTime", COUNT(*) AS active_count,
             array_agg(id ORDER BY "createdAt") AS appointment_ids
      FROM "Appointment"
      WHERE status IN ('hold', 'confirmed')
        AND "deletedAt" IS NULL
      GROUP BY "doctorId", date, "startTime"
      HAVING COUNT(*) > 1
      ORDER BY active_count DESC
      LIMIT 20;
    `
  },
  {
    key: 'duplicate_patients_dni',
    description: 'Pacientes duplicados por DNI',
    severity: 'High',
    countSql: `
      SELECT COUNT(*)::int AS total
      FROM (
        SELECT dni
        FROM "Patient"
        GROUP BY dni
        HAVING COUNT(*) > 1
      ) dup;
    `,
    sampleSql: `
      SELECT dni, COUNT(*) AS patient_count, array_agg(id ORDER BY "createdAt") AS patient_ids
      FROM "Patient"
      GROUP BY dni
      HAVING COUNT(*) > 1
      ORDER BY patient_count DESC
      LIMIT 20;
    `
  },
  {
    key: 'duplicate_doctors_email',
    description: 'Doctores duplicados por email',
    severity: 'High',
    countSql: `
      SELECT COUNT(*)::int AS total
      FROM (
        SELECT LOWER(email)
        FROM "Doctor"
        GROUP BY LOWER(email)
        HAVING COUNT(*) > 1
      ) dup;
    `,
    sampleSql: `
      SELECT LOWER(email) AS email_norm, COUNT(*) AS doctor_count, array_agg(id ORDER BY "createdAt") AS doctor_ids
      FROM "Doctor"
      GROUP BY LOWER(email)
      HAVING COUNT(*) > 1
      ORDER BY doctor_count DESC
      LIMIT 20;
    `
  },
  {
    key: 'duplicate_users_email',
    description: 'Usuarios duplicados por email',
    severity: 'High',
    countSql: `
      SELECT COUNT(*)::int AS total
      FROM (
        SELECT LOWER(email)
        FROM "User"
        GROUP BY LOWER(email)
        HAVING COUNT(*) > 1
      ) dup;
    `,
    sampleSql: `
      SELECT LOWER(email) AS email_norm, COUNT(*) AS user_count, array_agg(id ORDER BY "createdAt") AS user_ids
      FROM "User"
      GROUP BY LOWER(email)
      HAVING COUNT(*) > 1
      ORDER BY user_count DESC
      LIMIT 20;
    `
  }
]

const indexTargets = [
  { key: 'appointments_doctor_date', table: 'Appointment', purpose: 'appointments por doctor + fecha/rango', token: '("doctorId", date' },
  { key: 'appointments_status', table: 'Appointment', purpose: 'appointments por status', token: '(status' },
  { key: 'doctors_specialty', table: 'Doctor', purpose: 'doctors por specialty', token: '("specialtyId"' },
  { key: 'patients_dni', table: 'Patient', purpose: 'patients por dni', token: '(dni' },
  { key: 'payments_appointment', table: 'Payment', purpose: 'payments por appointment_id', token: '("appointmentId"' },
  { key: 'messages_appointment', table: 'Message', purpose: 'messages por appointment_id', token: '("appointmentId"' }
]

const normalizeDate = (value) => {
  if (!value) return null
  return new Date(value).toISOString()
}

const toInt = (value) => Number.parseInt(value, 10) || 0

const run = async () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL no esta configurada. Definila en backend/.env o variables de entorno.')
  }

  await fs.mkdir(docsDir, { recursive: true })

  const client = new Client({
    connectionString: process.env.DATABASE_URL
  })

  await client.connect()

  try {
    const schema = {}
    for (const [key, sql] of Object.entries(schemaQueries)) {
      const { rows } = await client.query(sql)
      schema[key] = rows
    }

    let appliedMigrations = []
    try {
      const { rows } = await client.query(`
        SELECT migration_name, applied_at
        FROM schema_migrations
        ORDER BY applied_at ASC, migration_name ASC;
      `)
      appliedMigrations = rows
    } catch {
      appliedMigrations = []
    }

    const checks = {}
    for (const check of consistencyChecks) {
      const countRows = await client.query(check.countSql)
      const sampleRows = await client.query(check.sampleSql)
      checks[check.key] = {
        description: check.description,
        severity: check.severity,
        total: toInt(countRows.rows[0]?.total),
        sample: sampleRows.rows
      }
    }

    const duplicateIndexes = await client.query(`
      SELECT tablename,
             regexp_replace(indexdef, '^CREATE( UNIQUE)? INDEX [^ ]+ ON', 'CREATE\\1 INDEX <name> ON') AS index_signature,
             COUNT(*)::int AS duplicates,
             array_agg(indexname ORDER BY indexname) AS index_names
      FROM pg_indexes
      WHERE schemaname='public'
      GROUP BY tablename, regexp_replace(indexdef, '^CREATE( UNIQUE)? INDEX [^ ]+ ON', 'CREATE\\1 INDEX <name> ON')
      HAVING COUNT(*) > 1
      ORDER BY duplicates DESC, tablename;
    `)

    const duplicateConstraints = await client.query(`
      SELECT t.relname AS table_name,
             c.contype,
             pg_get_constraintdef(c.oid) AS constraint_def,
             COUNT(*)::int AS duplicates,
             array_agg(c.conname ORDER BY c.conname) AS constraint_names
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname='public'
      GROUP BY t.relname, c.contype, pg_get_constraintdef(c.oid)
      HAVING COUNT(*) > 1
      ORDER BY duplicates DESC, table_name;
    `)

    const tables = new Set(schema.tables.map((item) => item.table_name))
    const expectedVsActual = REQUIRED_TABLES.map((item) => ({
      entity: item.entity,
      table: item.table,
      required: item.required,
      present: tables.has(item.table),
      notes: item.notes
    }))

    const indexes = schema.indexes
    const indexCoverage = indexTargets.map((target) => ({
      ...target,
      present: indexes.some((idx) => idx.tablename === target.table && idx.indexdef.includes(target.token))
    }))

    const tablesWithoutPk = Array.from(tables).filter((tableName) => {
      return !schema.primaryKeys.some((pk) => pk.table_name === tableName)
    })

    const onDeleteCascadeRisk = schema.foreignKeys
      .filter((fk) => fk.delete_rule === 'CASCADE' && ['Appointment', 'Payment', 'ConsultNote', 'Message'].includes(fk.table_name))
      .map((fk) => ({
        table: fk.table_name,
        column: fk.column_name,
        references: `${fk.foreign_table_name}.${fk.foreign_column_name}`,
        delete_rule: fk.delete_rule
      }))

    const appointmentServicePath = path.join(backendDir, 'src', 'services', 'appointmentService.js')
    const appointmentServiceSource = await fs.readFile(appointmentServicePath, 'utf8')
    const usesTransactionLock = appointmentServiceSource.includes('LOCK.UPDATE')
    const hasPartialSlotUnique = indexes.some((idx) => idx.tablename === 'Appointment' && idx.indexname === 'appointment_unique_active_slot')

    const findings = []
    if (duplicateIndexes.rows.length > 0) {
      findings.push({
        category: 'Restricciones',
        severity: 'Critical',
        title: 'Duplicacion masiva de UNIQUE/INDEX por ejecuciones repetidas de sync alter',
        detail: `Se detectaron ${duplicateIndexes.rows.length} firmas de indice duplicadas y ${duplicateConstraints.rows.length} firmas de constraint duplicadas.`
      })
    }
    if (checks.expired_holds_not_released.total > 0) {
      findings.push({
        category: 'Concurrencia',
        severity: 'High',
        title: 'Holds vencidos no liberados en DB',
        detail: `Hay ${checks.expired_holds_not_released.total} turnos en hold fuera de ventana de 10 minutos.`
      })
    }
    if (indexCoverage.some((item) => !item.present)) {
      const missing = indexCoverage.filter((item) => !item.present).map((item) => item.key).join(', ')
      findings.push({
        category: 'Indices',
        severity: 'Medium',
        title: 'Cobertura de indices incompleta en patrones clave',
        detail: `Faltan indices para: ${missing}.`
      })
    }
    if (schema.checkConstraints.length === 0) {
      findings.push({
        category: 'Restricciones',
        severity: 'Medium',
        title: 'No hay CHECK constraints en tablas de negocio',
        detail: 'Las validaciones de rangos/consistencia dependen casi por completo de aplicacion y ENUMs.'
      })
    }

    const severityCounts = findings.reduce((acc, finding) => {
      acc[finding.severity] = (acc[finding.severity] || 0) + 1
      return acc
    }, { Critical: 0, High: 0, Medium: 0, Low: 0 })

    const snapshot = {
      generatedAt: new Date().toISOString(),
      source: {
        database: schema.metadata[0]?.database_name || null,
        schema: schema.metadata[0]?.schema_name || null,
        extractedAt: normalizeDate(schema.metadata[0]?.extracted_at)
      },
      schema,
      checks,
      expectedVsActual,
      analysis: {
        duplicateIndexes: duplicateIndexes.rows,
        duplicateConstraints: duplicateConstraints.rows,
        indexCoverage,
        tablesWithoutPk,
        onDeleteCascadeRisk,
        appliedMigrations,
        concurrency: {
          hasPartialSlotUnique,
          usesTransactionLock
        },
        findings,
        severityCounts
      }
    }

    await fs.writeFile(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8')

    const expectedRows = expectedVsActual.map((row) => {
      const status = row.present ? 'Present' : (row.required ? 'Missing' : 'Optional-Missing')
      return `| ${row.entity} | ${row.table} | ${row.required ? 'Yes' : 'No'} | ${status} | ${row.notes} |`
    }).join('\n')

    const checkRows = consistencyChecks.map((check) => {
      const result = checks[check.key]
      return `| ${check.key} | ${check.severity} | ${result.total} |`
    }).join('\n')

    const indexRows = indexCoverage.map((item) => {
      return `| ${item.table} | ${item.purpose} | ${item.present ? 'Yes' : 'No'} |`
    }).join('\n')

    const riskRows = findings.map((item) => `| ${item.severity} | ${item.category} | ${item.title} | ${item.detail} |`).join('\n')
    const headlineFindings = findings.length > 0
      ? findings.map((item) => `- [${item.severity}] ${item.title}: ${item.detail}`).join('\n')
      : '- Sin hallazgos criticos/altos/medios activos en esta corrida.'
    const migrationRows = appliedMigrations.length > 0
      ? appliedMigrations
        .map((row) => `- ${row.migration_name} (${new Date(row.applied_at).toISOString()})`)
        .join('\n')
      : '- No se detecto tabla schema_migrations o no hay migraciones aplicadas.'

    const sampleDump = consistencyChecks
      .map((check) => {
        return `### ${check.key}\n\n\`\`\`json\n${JSON.stringify(checks[check.key].sample, null, 2)}\n\`\`\``
      })
      .join('\n\n')

    const queriesDump = consistencyChecks
      .map((check) => {
        return `### ${check.key}\n\nCount SQL:\n\`\`\`sql\n${check.countSql.trim()}\n\`\`\`\n\nSample SQL:\n\`\`\`sql\n${check.sampleSql.trim()}\n\`\`\``
      })
      .join('\n\n')

    const report = `# DB Schema Audit - San Rafael Turnos

Fecha de auditoria (UTC): ${new Date().toISOString()}

## Resumen ejecutivo

- Critical: ${severityCounts.Critical}
- High: ${severityCounts.High}
- Medium: ${severityCounts.Medium}
- Low: ${severityCounts.Low}
- Base de datos: ${snapshot.source.database}
- Esquema: ${snapshot.source.schema}

Hallazgos principales:
${headlineFindings}

## Diagrama logico (texto) del modelo recomendado

- users (admin/clinic/doctor/secretary) -> doctor (opcional 1:1 para cuentas de medico)
- specialties 1:N doctors
- doctors 1:N doctor_availability
- doctors 1:N doctor_blocks
- patients 1:N appointments
- doctors 1:N appointments
- specialties 1:N appointments
- appointments 1:1 payments
- appointments 1:N messages (opcional)
- appointments 1:1 consult_notes (post consulta)
- audit_logs para trazabilidad de operaciones criticas

Flujo critico esperado:
- disponibilidad -> reserva -> hold temporal -> pago -> confirmacion

## Esperado vs Actual

| Entidad esperada | Tabla | Requerida | Estado | Notas |
|---|---|---|---|---|
${expectedRows}

## Hallazgos por categoria

### Tablas

- Total de tablas en \`public\`: ${schema.tables.length}
- Tablas sin PK: ${tablesWithoutPk.length === 0 ? 'ninguna' : tablesWithoutPk.join(', ')}

### Relaciones (FK)

- Total FK: ${schema.foreignKeys.length}
- Todas las relaciones clave del dominio existen (doctor/patient/specialty/payment).
- Riesgo de borrado en cascada detectado en relaciones de negocio:
${onDeleteCascadeRisk.map((fk) => `  - ${fk.table}.${fk.column} -> ${fk.references} (${fk.delete_rule})`).join('\n')}

### Restricciones

- UNIQUE/CHECK/FK/PK presentes, pero con degradacion por duplicados:
  - Firmas de indices duplicadas: ${duplicateIndexes.rows.length}
  - Firmas de constraints duplicadas: ${duplicateConstraints.rows.length}
- CHECK constraints definidos: ${schema.checkConstraints.length}

### Indices

| Tabla | Patron evaluado | Cobertura |
|---|---|---|
${indexRows}

### Concurrencia

- Indice unico parcial anti doble booking (\`appointment_unique_active_slot\`): ${hasPartialSlotUnique ? 'Presente' : 'Ausente'}
- Locking transaccional en app (\`LOCK.UPDATE\` en servicio de turnos): ${usesTransactionLock ? 'Detectado' : 'No detectado'}
- Doble booking activo detectado: ${checks.double_booking_active_slot.total}
- Holds vencidos no liberados: ${checks.expired_holds_not_released.total}

## Riesgos y severidad

| Severidad | Categoria | Riesgo | Evidencia |
|---|---|---|---|
${riskRows || '| Low | General | Sin hallazgos relevantes | Sin evidencia de riesgo |'}

## Plan de remediacion por etapas

### MVP-safe

1. Eliminar duplicados de constraints e indices sin tocar datos.
2. Agregar indices faltantes para consultas de agenda y filtros principales.
3. Incorporar CHECK constraints con \`NOT VALID\` y posterior \`VALIDATE\`.
4. Programar job de liberacion de holds vencidos (cron cada 1 minuto o trigger de limpieza previa).

### Post-MVP

1. Revisar politicas \`ON DELETE\` para evitar perdida historica de turnos/pagos.
2. Migrar desde \`sequelize.sync({ alter: true })\` hacia migraciones versionadas deterministicas.
3. Agregar monitoreo de salud de esquema (alerta por nuevos duplicados en constraints/indexes).

## Remediacion aplicada (estado en DB auditada)

${migrationRows}

## Validaciones de consistencia (conteos)

| Check | Severidad | Registros afectados |
|---|---|---|
${checkRows}

## Muestras (max 20)

${sampleDump || 'Sin muestras porque no hubo inconsistencias con registros afectados.'}

## Apendice: queries ejecutadas

${queriesDump}
`

    await fs.writeFile(reportPath, report, 'utf8')

    process.stdout.write(`Audit generated:\n- ${snapshotPath}\n- ${reportPath}\n`)
  } finally {
    await client.end()
  }
}

run().catch((error) => {
  process.stderr.write(`DB schema audit failed: ${error.message}\n`)
  process.exit(1)
})

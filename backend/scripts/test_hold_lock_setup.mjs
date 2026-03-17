import 'dotenv/config'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from '../src/config/env.js'
import { sequelize, Specialty, Doctor, Patient, Appointment } from '../src/db/models/index.js'
import { contextFilePath, writeContext } from './test_hold_lock_common.mjs'

const TEST_PREFIX = '__codex_hold_lock_test__'

const upsertParanoid = async (Model, where, values) => {
  const existing = await Model.findOne({ where, paranoid: false })
  if (existing) {
    if (existing.deletedAt) {
      await existing.restore()
    }
    await existing.update(values)
    return existing
  }
  return Model.create(values)
}

const buildTimes = () => {
  const now = new Date()
  const futureDate = new Date(now)
  futureDate.setDate(futureDate.getDate() + 1)

  const date = futureDate.toISOString().slice(0, 10)
  const minuteBucket = (Math.floor(now.getMinutes() / 5) * 5 + 10) % 60
  const hour = 9 + (Math.floor(now.getTime() / 1000) % 6)
  const startTime = `${String(hour).padStart(2, '0')}:${String(minuteBucket).padStart(2, '0')}:00`

  const endMinute = (minuteBucket + 30) % 60
  const endHour = hour + (minuteBucket + 30 >= 60 ? 1 : 0)
  const endTime = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}:00`

  return { date, startTime, endTime }
}

export const runHoldLockSetup = async () => {
  const runId = randomUUID()
  const marker = `${TEST_PREFIX}:${runId}`
  const staleMinutes = config.APPOINTMENT_HOLD_MINUTES + 2
  const staleCreatedAt = new Date(Date.now() - (staleMinutes * 60 * 1000))

  await sequelize.authenticate()

  const specialty = await upsertParanoid(
    Specialty,
    { name: `${TEST_PREFIX}_specialty` },
    {
      name: `${TEST_PREFIX}_specialty`,
      description: 'Especialidad fixture para prueba de advisory lock',
      fee: 1000,
      isActive: true
    }
  )

  const doctor = await upsertParanoid(
    Doctor,
    { email: `${TEST_PREFIX}@doctor.local` },
    {
      fullName: 'Doctor Lock Test',
      email: `${TEST_PREFIX}@doctor.local`,
      phone: '+5492604990001',
      dni: '99000111',
      consultorio: 1,
      specialtyId: specialty.id,
      bio: 'Fixture para test de lock',
      isActive: true
    }
  )

  const [patient] = await Patient.findOrCreate({
    where: { dni: '99000999' },
    defaults: {
      dni: '99000999',
      fullName: 'Paciente Lock Test',
      phone: '+5492604990002',
      city: 'San Rafael'
    }
  })
  await patient.update({
    fullName: 'Paciente Lock Test',
    phone: '+5492604990002',
    city: 'San Rafael'
  })

  const { date, startTime, endTime } = buildTimes()

  const appointment = await Appointment.create({
    doctorId: doctor.id,
    specialtyId: specialty.id,
    patientId: patient.id,
    insuranceId: null,
    date,
    startTime,
    endTime,
    symptoms: marker,
    status: 'hold',
    createdAt: staleCreatedAt,
    updatedAt: staleCreatedAt
  })

  const context = {
    runId,
    marker,
    appointmentId: appointment.id,
    specialtyId: specialty.id,
    doctorId: doctor.id,
    patientId: patient.id,
    holdStatus: 'hold',
    expectedStatuses: ['cancelled', 'expired'],
    staleMinutes,
    generatedAt: new Date().toISOString()
  }

  await writeContext(context)

  return {
    appointmentId: appointment.id,
    contextPath: contextFilePath,
    context
  }
}

const isDirectRun = path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)

if (isDirectRun) {
  runHoldLockSetup()
    .then((result) => {
      process.stdout.write(`HOLD_LOCK_TEST_APPOINTMENT_ID=${result.appointmentId}\n`)
      process.stdout.write(`HOLD_LOCK_TEST_CONTEXT_PATH=${result.contextPath}\n`)
      process.exit(0)
    })
    .catch((error) => {
      process.stderr.write(`HOLD_LOCK_TEST_SETUP_FAIL=${error.message}\n`)
      process.exit(1)
    })
}

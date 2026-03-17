import test, { after, before, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import jwt from 'jsonwebtoken'
import request from 'supertest'
import { Op, QueryTypes } from 'sequelize'
import { createDbTestHarness } from '../helpers/dbTestHarness.js'
import { buildAppointmentRequestPayload, buildPatientPayload } from '../helpers/factories.js'
import { seedBaselineFixtures } from '../helpers/fixtures.js'

const buildAccessToken = (claims) => {
  return jwt.sign(claims, process.env.JWT_ACCESS_SECRET, {
    algorithm: 'HS256',
    expiresIn: '15m'
  })
}

const buildAuthorizationHeader = (claims) => `Bearer ${buildAccessToken(claims)}`
const buildPatientAuthHeader = (patient) => buildAuthorizationHeader({
  sub: patient.id,
  role: 'patient',
  patientId: patient.id,
  dni: patient.dni
})

const harness = createDbTestHarness()
let app
let models
let fixtures

before(async () => {
  const context = await harness.setup()
  app = context.app
  models = context.models
})

beforeEach(async () => {
  await harness.truncateAll()
  fixtures = await seedBaselineFixtures({ models })
})

after(async () => {
  await harness.teardown()
})

test('Schema smoke: migraciones crean tablas esperadas en schema temporal', async () => {
  const expectedTables = [
    'Appointment',
    'AuditLog',
    'ConsultNote',
    'Doctor',
    'DoctorAvailability',
    'DoctorBlock',
    'HealthInsurance',
    'Message',
    'Patient',
    'Payment',
    'PaymentWebhookEvent',
    'RefreshToken',
    'Specialty',
    'User',
    'schema_migrations'
  ]

  const rows = await models.sequelize.query(
    `
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = current_schema()
      ORDER BY tablename;
    `,
    { type: QueryTypes.SELECT }
  )

  const existingTables = new Set(rows.map((row) => row.tablename))
  for (const tableName of expectedTables) {
    assert.equal(existingTables.has(tableName), true, `Tabla faltante tras migrar: ${tableName}`)
  }
})

test('RBAC real: admin/clinic/doctor/patient con permisos esperados', async () => {
  const adminAuth = buildAuthorizationHeader({
    sub: fixtures.adminUser.id,
    role: 'admin'
  })
  const clinicAuth = buildAuthorizationHeader({
    sub: fixtures.clinicUser.id,
    role: 'clinic'
  })
  const doctorAuth = buildAuthorizationHeader({
    sub: fixtures.doctorUser.id,
    role: 'doctor',
    doctorId: fixtures.doctor.id
  })
  const patientAuth = buildAuthorizationHeader({
    sub: fixtures.patient.id,
    role: 'patient',
    patientId: fixtures.patient.id,
    dni: fixtures.patient.dni
  })

  const specialtyResponse = await request(app)
    .post('/api/specialties')
    .set('Authorization', adminAuth)
    .send({
      name: 'Cardiologia Integracion',
      fee: 20000
    })

  assert.equal(specialtyResponse.status, 201)

  const doctorCreateResponse = await request(app)
    .post('/api/doctors')
    .set('Authorization', adminAuth)
    .send({
      fullName: 'Dr. API RBAC',
      email: `doctor.rbac.${Date.now()}@test.local`,
      phone: '+5492615559876',
      dni: '30999888',
      consultorio: 12,
      specialtyId: fixtures.specialty.id
    })

  assert.equal(doctorCreateResponse.status, 201)

  const clinicListResponse = await request(app)
    .get('/api/appointments')
    .set('Authorization', clinicAuth)

  assert.equal(clinicListResponse.status, 200)

  const appointmentPayload = buildAppointmentRequestPayload({
    doctorId: fixtures.doctor.id,
    specialtyId: fixtures.specialty.id,
    date: fixtures.appointmentDate,
    startTime: '09:00',
    patient: fixtures.patient
  })

  const clinicCreateAppointmentResponse = await request(app)
    .post('/api/appointments')
    .set('Authorization', clinicAuth)
    .send(appointmentPayload)

  assert.equal(clinicCreateAppointmentResponse.status, 201)

  const doctorSelfAvailabilityResponse = await request(app)
    .get(`/api/doctors/${fixtures.doctor.id}/availability`)
    .set('Authorization', doctorAuth)

  assert.equal(doctorSelfAvailabilityResponse.status, 200)

  const doctorOtherAvailabilityResponse = await request(app)
    .get(`/api/doctors/${fixtures.otherDoctor.id}/availability`)
    .set('Authorization', doctorAuth)

  assert.equal(doctorOtherAvailabilityResponse.status, 403)

  const patientMyAppointmentsResponse = await request(app)
    .get('/api/appointments/my')
    .set('Authorization', patientAuth)

  assert.equal(patientMyAppointmentsResponse.status, 200)

  const patientListAllResponse = await request(app)
    .get('/api/appointments')
    .set('Authorization', patientAuth)

  assert.equal(patientListAllResponse.status, 403)
})

test('Turnos real DB: slots + concurrencia evita doble booking en mismo horario', async () => {
  const clinicAuth = buildAuthorizationHeader({
    sub: fixtures.clinicUser.id,
    role: 'clinic'
  })

  const slotsResponse = await request(app)
    .get('/api/slots')
    .query({
      doctorId: fixtures.doctor.id,
      date: fixtures.appointmentDate
    })

  assert.equal(slotsResponse.status, 200)
  assert.equal(Array.isArray(slotsResponse.body?.data?.slots), true)
  assert.equal(
    slotsResponse.body.data.slots.some((slot) => slot.startTime === '09:00'),
    true
  )

  const payload = buildAppointmentRequestPayload({
    doctorId: fixtures.doctor.id,
    specialtyId: fixtures.specialty.id,
    date: fixtures.appointmentDate,
    startTime: '09:00',
    patient: fixtures.patient
  })

  const runCreateRequest = () => request(app)
    .post('/api/appointments')
    .set('Authorization', clinicAuth)
    .send(payload)

  const [firstResponse, secondResponse] = await Promise.all([
    runCreateRequest(),
    runCreateRequest()
  ])

  const sortedStatuses = [firstResponse.status, secondResponse.status].sort((a, b) => a - b)
  assert.deepEqual(sortedStatuses, [201, 409])

  const activeAppointments = await models.Appointment.findAll({
    where: {
      doctorId: fixtures.doctor.id,
      date: fixtures.appointmentDate,
      status: {
        [Op.in]: ['hold', 'confirmed']
      }
    }
  })

  const sameSlotAppointments = activeAppointments.filter((item) => String(item.startTime).startsWith('09:00'))
  assert.equal(sameSlotAppointments.length, 1)
})

test('Turnos real DB: paciente autenticado no puede reservar con un DNI distinto al de su sesion', async () => {
  const patientAuth = buildPatientAuthHeader(fixtures.patient)

  const mismatchedPayload = buildAppointmentRequestPayload({
    doctorId: fixtures.doctor.id,
    specialtyId: fixtures.specialty.id,
    date: fixtures.appointmentDate,
    startTime: '10:30',
    patient: {
      ...fixtures.patient,
      dni: '30999888'
    }
  })

  const response = await request(app)
    .post('/api/appointments')
    .set('Authorization', patientAuth)
    .send(mismatchedPayload)

  assert.equal(response.status, 403)
  assert.equal(response.body?.ok, false)
  assert.equal(response.body?.error?.code, 'dni_mismatch')

  const persistedAppointments = await models.Appointment.count()
  assert.equal(persistedAppointments, 0)
})

test('Turnos real DB: un slot reservado deja de aparecer como disponible', async () => {
  const patientAuth = buildPatientAuthHeader(fixtures.patient)

  const beforeResponse = await request(app)
    .get('/api/slots')
    .query({
      doctorId: fixtures.doctor.id,
      date: fixtures.appointmentDate
    })

  assert.equal(beforeResponse.status, 200)
  assert.equal(
    beforeResponse.body?.data?.slots?.some((slot) => slot.startTime === '10:30'),
    true
  )

  const appointmentPayload = buildAppointmentRequestPayload({
    doctorId: fixtures.doctor.id,
    specialtyId: fixtures.specialty.id,
    date: fixtures.appointmentDate,
    startTime: '10:30',
    patient: fixtures.patient
  })

  const createAppointmentResponse = await request(app)
    .post('/api/appointments')
    .set('Authorization', patientAuth)
    .send(appointmentPayload)

  assert.equal(createAppointmentResponse.status, 201)

  const afterResponse = await request(app)
    .get('/api/slots')
    .query({
      doctorId: fixtures.doctor.id,
      date: fixtures.appointmentDate
    })

  assert.equal(afterResponse.status, 200)
  assert.equal(
    afterResponse.body?.data?.slots?.some((slot) => slot.startTime === '10:30'),
    false
  )
})

test('Aislamiento real DB: otro paciente no puede acceder ni operar sobre turno y pago ajenos', async () => {
  const ownerAuth = buildPatientAuthHeader(fixtures.patient)
  const otherPatient = await models.Patient.create(buildPatientPayload({
    dni: '30999887',
    fullName: 'Paciente Aislado',
    phone: '+5492615553030'
  }))
  const otherPatientAuth = buildPatientAuthHeader(otherPatient)

  const appointmentPayload = buildAppointmentRequestPayload({
    doctorId: fixtures.doctor.id,
    specialtyId: fixtures.specialty.id,
    date: fixtures.appointmentDate,
    startTime: '11:00',
    patient: fixtures.patient
  })

  const createAppointmentResponse = await request(app)
    .post('/api/appointments')
    .set('Authorization', ownerAuth)
    .send(appointmentPayload)

  assert.equal(createAppointmentResponse.status, 201)

  const appointmentId = createAppointmentResponse.body?.data?.appointment?.id
  assert.equal(typeof appointmentId, 'string')

  const ownerMyAppointmentsResponse = await request(app)
    .get('/api/appointments/my')
    .set('Authorization', ownerAuth)

  assert.equal(ownerMyAppointmentsResponse.status, 200)
  assert.equal(ownerMyAppointmentsResponse.body?.data?.length, 1)
  assert.equal(ownerMyAppointmentsResponse.body?.data?.[0]?.id, appointmentId)

  const otherMyAppointmentsResponse = await request(app)
    .get('/api/appointments/my')
    .set('Authorization', otherPatientAuth)

  assert.equal(otherMyAppointmentsResponse.status, 200)
  assert.equal(otherMyAppointmentsResponse.body?.data?.length, 0)

  const getAppointmentAsOtherPatientResponse = await request(app)
    .get(`/api/appointments/${appointmentId}`)
    .set('Authorization', otherPatientAuth)

  assert.equal(getAppointmentAsOtherPatientResponse.status, 403)
  assert.equal(getAppointmentAsOtherPatientResponse.body?.error?.code, 'forbidden')

  const getPaymentAsOtherPatientResponse = await request(app)
    .get(`/api/payments/${appointmentId}`)
    .set('Authorization', otherPatientAuth)

  assert.equal(getPaymentAsOtherPatientResponse.status, 403)
  assert.equal(getPaymentAsOtherPatientResponse.body?.error?.code, 'forbidden')

  const confirmPaymentAsOtherPatientResponse = await request(app)
    .post('/api/payments/mock/confirm')
    .set('Authorization', otherPatientAuth)
    .send({ appointmentId })

  assert.equal(confirmPaymentAsOtherPatientResponse.status, 403)
  assert.equal(confirmPaymentAsOtherPatientResponse.body?.error?.code, 'forbidden')
})

test('Pago mock real DB: pending -> paid y turno confirmado', async () => {
  const patientAuth = buildPatientAuthHeader(fixtures.patient)

  const appointmentPayload = buildAppointmentRequestPayload({
    doctorId: fixtures.doctor.id,
    specialtyId: fixtures.specialty.id,
    date: fixtures.appointmentDate,
    startTime: '10:00',
    patient: fixtures.patient
  })

  const createAppointmentResponse = await request(app)
    .post('/api/appointments')
    .set('Authorization', patientAuth)
    .send(appointmentPayload)

  assert.equal(createAppointmentResponse.status, 201)
  assert.equal(createAppointmentResponse.body?.data?.appointment?.status, 'hold')
  assert.equal(createAppointmentResponse.body?.data?.payment?.status, 'pending')

  const appointmentId = createAppointmentResponse.body.data.appointment.id

  const confirmPaymentResponse = await request(app)
    .post('/api/payments/mock/confirm')
    .set('Authorization', patientAuth)
    .send({ appointmentId })

  assert.equal(confirmPaymentResponse.status, 200)
  assert.equal(confirmPaymentResponse.body?.data?.status, 'paid')

  const getPaymentResponse = await request(app)
    .get(`/api/payments/${appointmentId}`)
    .set('Authorization', patientAuth)

  assert.equal(getPaymentResponse.status, 200)
  assert.equal(getPaymentResponse.body?.data?.status, 'paid')

  const getAppointmentResponse = await request(app)
    .get(`/api/appointments/${appointmentId}`)
    .set('Authorization', patientAuth)

  assert.equal(getAppointmentResponse.status, 200)
  assert.equal(getAppointmentResponse.body?.data?.status, 'confirmed')
})

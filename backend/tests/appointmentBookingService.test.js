import test from 'node:test'
import assert from 'node:assert/strict'
import { createAppointmentWithHold } from '../src/services/appointmentCrudService.js'
import { AppError } from '../src/utils/errors.js'

const buildPayload = () => ({
  doctorId: 'doctor-1',
  specialtyId: 'specialty-1',
  insuranceId: 'insurance-1',
  date: '2026-03-15',
  startTime: '10:00',
  slotMinutes: 30,
  symptoms: 'Dolor de garganta',
  fullName: 'Paciente Test',
  dni: '30111222',
  phone: '+5492615550000',
  streetAndNumber: 'Siempre Viva 123',
  city: 'San Rafael'
})

const buildDependencies = () => {
  const calls = {
    releaseExpiredHolds: 0,
    ensureDoctorAvailableAtSlot: 0,
    ensureNoSlotConflict: 0,
    writeAuditLog: 0
  }

  const patient = {
    id: 'patient-1',
    update: async () => {}
  }

  return {
    calls,
    deps: {
      sequelize: {
        transaction: async (callback) => callback({ id: 'tx-1' })
      },
      releaseExpiredHolds: async () => { calls.releaseExpiredHolds += 1 },
      ensureDoctorAvailableAtSlot: async () => { calls.ensureDoctorAvailableAtSlot += 1 },
      ensureNoSlotConflict: async () => { calls.ensureNoSlotConflict += 1 },
      findOrCreatePatientByDni: async () => [patient],
      findSpecialtyById: async () => ({ id: 'specialty-1', fee: '10000.00' }),
      findActiveInsuranceById: async () => ({ id: 'insurance-1', discountPercent: '20.00' }),
      createAppointmentRecord: async ({ payload }) => ({
        id: 'appointment-1',
        ...payload
      }),
      createPaymentRecord: async ({ payload }) => ({
        id: 'payment-1',
        ...payload
      }),
      createMockPaymentIntent: ({ appointmentId, amount }) => ({
        appointmentId,
        amount,
        provider: 'mock'
      }),
      writeAuditLog: async () => { calls.writeAuditLog += 1 }
    }
  }
}

test('createAppointmentWithHold crea turno hold con pricing y pago pendiente', async () => {
  const { deps, calls } = buildDependencies()

  const result = await createAppointmentWithHold(
    {
      payload: buildPayload(),
      auth: {
        role: 'patient',
        sub: 'patient-user-1',
        dni: '30111222'
      }
    },
    deps
  )

  assert.equal(result.appointment.status, 'hold')
  assert.equal(result.payment.status, 'pending')
  assert.equal(result.pricing.baseAmount, 10000)
  assert.equal(result.pricing.discountPercent, 20)
  assert.equal(result.pricing.finalAmount, 8000)
  assert.equal(result.paymentIntent.appointmentId, 'appointment-1')
  assert.equal(calls.releaseExpiredHolds, 1)
  assert.equal(calls.ensureDoctorAvailableAtSlot, 1)
  assert.equal(calls.ensureNoSlotConflict, 1)
  assert.equal(calls.writeAuditLog, 1)
})

test('createAppointmentWithHold traduce unique conflict a AppError de slot_conflict', async () => {
  const { deps } = buildDependencies()
  deps.ensureNoSlotConflict = async () => {
    const uniqueConstraintError = new Error('duplicate slot')
    uniqueConstraintError.name = 'SequelizeUniqueConstraintError'
    throw uniqueConstraintError
  }

  await assert.rejects(
    () => createAppointmentWithHold(
      {
        payload: buildPayload(),
        auth: {
          role: 'clinic',
          sub: 'clinic-user-1'
        }
      },
      deps
    ),
    (error) => {
      assert.equal(error instanceof AppError, true)
      assert.equal(error.code, 'slot_conflict')
      assert.equal(error.statusCode, 409)
      return true
    }
  )
})

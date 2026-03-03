import {
  Appointment,
  Doctor,
  Patient,
  Specialty,
  HealthInsurance,
  Payment
} from '../db/models/index.js'

export const appointmentDefaultInclude = [
  { model: Doctor, as: 'doctor' },
  { model: Specialty, as: 'specialty' },
  { model: HealthInsurance, as: 'insurance' },
  { model: Patient, as: 'patient' },
  { model: Payment, as: 'payment' }
]

export const findAppointmentById = async ({
  appointmentId,
  include = appointmentDefaultInclude,
  transaction,
  lock
}) => {
  return Appointment.findByPk(appointmentId, {
    include,
    transaction,
    lock
  })
}

export const findAndCountAppointments = async ({
  where,
  include = appointmentDefaultInclude,
  order,
  offset,
  limit
}) => {
  return Appointment.findAndCountAll({
    where,
    include,
    order,
    offset,
    limit
  })
}

export const findOrCreatePatientByDni = async ({ dni, defaults, transaction }) => {
  return Patient.findOrCreate({
    where: { dni },
    defaults,
    transaction
  })
}

export const findSpecialtyById = async ({ specialtyId, transaction }) => {
  return Specialty.findByPk(specialtyId, { transaction })
}

export const findActiveInsuranceById = async ({ insuranceId, transaction }) => {
  return HealthInsurance.findOne({
    where: {
      id: insuranceId,
      isActive: true
    },
    transaction
  })
}

export const createAppointmentRecord = async ({ payload, transaction }) => {
  return Appointment.create(payload, { transaction })
}

export const createPaymentRecord = async ({ payload, transaction }) => {
  return Payment.create(payload, { transaction })
}

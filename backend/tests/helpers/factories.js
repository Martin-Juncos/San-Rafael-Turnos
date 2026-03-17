const DEFAULT_SPECIALTY_FEE = 10000
const DEFAULT_SLOT_MINUTES = 30

export const buildSpecialtyPayload = (overrides = {}) => ({
  name: overrides.name || `Clinica General ${Date.now()}`,
  description: overrides.description || 'Especialidad para pruebas de integracion',
  fee: overrides.fee ?? DEFAULT_SPECIALTY_FEE,
  isActive: overrides.isActive ?? true
})

export const buildDoctorPayload = ({ specialtyId, suffix = 'primary', overrides = {} }) => ({
  fullName: overrides.fullName || `Dr. Integracion ${suffix}`,
  email: overrides.email || `doctor.${suffix}.${Date.now()}@test.local`,
  phone: overrides.phone || '+5492615551000',
  dni: overrides.dni || `30${Math.floor(Math.random() * 9000000 + 1000000)}`,
  consultorio: overrides.consultorio ?? 1,
  specialtyId,
  bio: overrides.bio || 'Perfil generado para tests de integracion',
  isActive: overrides.isActive ?? true
})

export const buildStaffUserPayload = ({ role, suffix, doctorId = null }) => ({
  role,
  accountType: role === 'doctor' ? 'doctor' : 'staff',
  email: `${role}.${suffix}.${Date.now()}@test.local`,
  passwordHash: `hash_${role}_${suffix}`,
  doctorId,
  fullName: `${role.toUpperCase()} ${suffix}`,
  phone: '+5492615552000',
  dni: `31${Math.floor(Math.random() * 9000000 + 1000000)}`,
  isActive: true
})

export const buildAvailabilityPayload = ({ doctorId, dayOfWeek, overrides = {} }) => ({
  doctorId,
  dayOfWeek,
  startTime: overrides.startTime || '09:00:00',
  endTime: overrides.endTime || '12:00:00',
  slotMinutes: overrides.slotMinutes ?? DEFAULT_SLOT_MINUTES,
  isActive: overrides.isActive ?? true
})

export const buildPatientPayload = (overrides = {}) => ({
  dni: overrides.dni || '30111222',
  fullName: overrides.fullName || 'Paciente Integracion',
  phone: overrides.phone || '+5492615553000',
  streetAndNumber: overrides.streetAndNumber || 'Mitre 123',
  city: overrides.city || 'San Rafael'
})

const resolvePatientFields = (patient = {}) => {
  const source = {
    ...(patient.dataValues ?? {}),
    ...patient
  }

  return {
    fullName: source.fullName,
    dni: source.dni,
    phone: source.phone,
    streetAndNumber: source.streetAndNumber,
    city: source.city
  }
}

export const buildAppointmentRequestPayload = ({
  doctorId,
  specialtyId,
  insuranceId,
  date,
  startTime = '09:00',
  slotMinutes = DEFAULT_SLOT_MINUTES,
  patient
}) => {
  const patientFields = resolvePatientFields(patient)

  return {
    doctorId,
    specialtyId,
    insuranceId,
    date,
    startTime,
    slotMinutes,
    symptoms: 'Consulta de control',
    fullName: patientFields.fullName,
    dni: patientFields.dni,
    phone: patientFields.phone,
    streetAndNumber: patientFields.streetAndNumber,
    city: patientFields.city
  }
}

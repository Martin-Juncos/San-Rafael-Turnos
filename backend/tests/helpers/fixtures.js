import {
  buildAvailabilityPayload,
  buildDoctorPayload,
  buildPatientPayload,
  buildSpecialtyPayload,
  buildStaffUserPayload
} from './factories.js'

const toIsoDate = (date) => date.toISOString().slice(0, 10)

const resolveNextDateForWeekday = (dayOfWeek) => {
  const base = new Date()
  base.setHours(0, 0, 0, 0)
  const delta = ((dayOfWeek - base.getDay()) + 7) % 7 || 7
  base.setDate(base.getDate() + delta)
  return toIsoDate(base)
}

export const seedBaselineFixtures = async ({ models, dayOfWeek = 2 }) => {
  const {
    Specialty,
    Doctor,
    DoctorAvailability,
    User,
    Patient
  } = models

  const appointmentDate = resolveNextDateForWeekday(dayOfWeek)

  const specialty = await Specialty.create(buildSpecialtyPayload())
  const doctor = await Doctor.create(buildDoctorPayload({ specialtyId: specialty.id, suffix: 'owner' }))
  const otherDoctor = await Doctor.create(buildDoctorPayload({ specialtyId: specialty.id, suffix: 'other' }))

  await DoctorAvailability.create(buildAvailabilityPayload({ doctorId: doctor.id, dayOfWeek }))
  await DoctorAvailability.create(buildAvailabilityPayload({ doctorId: otherDoctor.id, dayOfWeek }))

  const adminUser = await User.create(buildStaffUserPayload({ role: 'admin', suffix: 'main' }))
  const clinicUser = await User.create(buildStaffUserPayload({ role: 'clinic', suffix: 'main' }))
  const doctorUser = await User.create(buildStaffUserPayload({
    role: 'doctor',
    suffix: 'main',
    doctorId: doctor.id
  }))

  const patient = await Patient.create(buildPatientPayload())

  return {
    appointmentDate,
    specialty,
    doctor,
    otherDoctor,
    adminUser,
    clinicUser,
    doctorUser,
    patient
  }
}

import { sequelize } from '../../config/database.js'
import { initUserModel, User } from './User.js'
import { initRefreshTokenModel, RefreshToken } from './RefreshToken.js'
import { initSpecialtyModel, Specialty } from './Specialty.js'
import { initHealthInsuranceModel, HealthInsurance } from './HealthInsurance.js'
import { initDoctorModel, Doctor } from './Doctor.js'
import { initDoctorAvailabilityModel, DoctorAvailability } from './DoctorAvailability.js'
import { initDoctorBlockModel, DoctorBlock } from './DoctorBlock.js'
import { initPatientModel, Patient } from './Patient.js'
import { initPatientOtpModel, PatientOtp } from './PatientOtp.js'
import { initAppointmentModel, Appointment } from './Appointment.js'
import { initPaymentModel, Payment } from './Payment.js'
import { initPaymentWebhookEventModel, PaymentWebhookEvent } from './PaymentWebhookEvent.js'
import { initMessageModel, Message } from './Message.js'
import { initAuditLogModel, AuditLog } from './AuditLog.js'
import { initConsultNoteModel, ConsultNote } from './ConsultNote.js'

let initialized = false

export const initModels = () => {
  if (initialized) {
    return
  }

  initUserModel(sequelize)
  initRefreshTokenModel(sequelize)
  initSpecialtyModel(sequelize)
  initHealthInsuranceModel(sequelize)
  initDoctorModel(sequelize)
  initDoctorAvailabilityModel(sequelize)
  initDoctorBlockModel(sequelize)
  initPatientModel(sequelize)
  initPatientOtpModel(sequelize)
  initAppointmentModel(sequelize)
  initPaymentModel(sequelize)
  initPaymentWebhookEventModel(sequelize)
  initMessageModel(sequelize)
  initAuditLogModel(sequelize)
  initConsultNoteModel(sequelize)

  Specialty.hasMany(Doctor, { foreignKey: 'specialtyId', as: 'doctors' })
  Doctor.belongsTo(Specialty, { foreignKey: 'specialtyId', as: 'specialty' })

  Doctor.hasMany(DoctorAvailability, { foreignKey: 'doctorId', as: 'availability' })
  DoctorAvailability.belongsTo(Doctor, { foreignKey: 'doctorId', as: 'doctor' })

  Doctor.hasMany(DoctorBlock, { foreignKey: 'doctorId', as: 'blocks' })
  DoctorBlock.belongsTo(Doctor, { foreignKey: 'doctorId', as: 'doctor' })

  Doctor.hasMany(Appointment, { foreignKey: 'doctorId', as: 'appointments' })
  Appointment.belongsTo(Doctor, {
    foreignKey: 'doctorId',
    as: 'doctor',
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE'
  })

  Specialty.hasMany(Appointment, { foreignKey: 'specialtyId', as: 'appointments' })
  Appointment.belongsTo(Specialty, {
    foreignKey: 'specialtyId',
    as: 'specialty',
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE'
  })

  HealthInsurance.hasMany(Appointment, { foreignKey: 'insuranceId', as: 'appointments' })
  Appointment.belongsTo(HealthInsurance, { foreignKey: 'insuranceId', as: 'insurance' })

  Patient.hasMany(Appointment, { foreignKey: 'patientId', as: 'appointments' })
  Appointment.belongsTo(Patient, {
    foreignKey: 'patientId',
    as: 'patient',
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE'
  })

  Appointment.hasOne(Payment, { foreignKey: 'appointmentId', as: 'payment' })
  Payment.belongsTo(Appointment, {
    foreignKey: 'appointmentId',
    as: 'appointment',
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE'
  })
  Payment.hasMany(PaymentWebhookEvent, { foreignKey: 'paymentId', as: 'webhookEvents' })
  PaymentWebhookEvent.belongsTo(Payment, { foreignKey: 'paymentId', as: 'payment' })

  Appointment.hasMany(Message, { foreignKey: 'appointmentId', as: 'messages' })
  Message.belongsTo(Appointment, {
    foreignKey: 'appointmentId',
    as: 'appointment',
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE'
  })

  Appointment.hasOne(ConsultNote, { foreignKey: 'appointmentId', as: 'consultNote' })
  ConsultNote.belongsTo(Appointment, { foreignKey: 'appointmentId', as: 'appointment' })

  Doctor.hasMany(ConsultNote, { foreignKey: 'doctorId', as: 'consultNotes' })
  ConsultNote.belongsTo(Doctor, { foreignKey: 'doctorId', as: 'doctor' })

  Patient.hasMany(ConsultNote, { foreignKey: 'patientId', as: 'consultNotes' })
  ConsultNote.belongsTo(Patient, { foreignKey: 'patientId', as: 'patient' })

  User.belongsTo(Doctor, { foreignKey: 'doctorId', as: 'doctor' })
  Doctor.hasOne(User, { foreignKey: 'doctorId', as: 'user' })

  User.hasMany(RefreshToken, { foreignKey: 'userId', as: 'refreshTokens' })
  RefreshToken.belongsTo(User, { foreignKey: 'userId', as: 'user' })

  initialized = true
}

initModels()

export {
  sequelize,
  User,
  RefreshToken,
  Specialty,
  HealthInsurance,
  Doctor,
  DoctorAvailability,
  DoctorBlock,
  Patient,
  PatientOtp,
  Appointment,
  Payment,
  PaymentWebhookEvent,
  Message,
  AuditLog,
  ConsultNote
}

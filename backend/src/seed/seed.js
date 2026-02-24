import bcrypt from 'bcryptjs'
import { sequelize } from '../config/database.js'
import {
  Specialty,
  Doctor,
  DoctorAvailability,
  User
} from '../db/models/index.js'
import { logger } from '../config/logger.js'

const upsertUser = async ({ role, email, password, doctorId = null }) => {
  const hash = await bcrypt.hash(password, 10)
  const [user] = await User.findOrCreate({
    where: { email },
    defaults: {
      role,
      email,
      passwordHash: hash,
      doctorId,
      isActive: true
    }
  })
  await user.update({ role, passwordHash: hash, doctorId, isActive: true })
  return user
}

const run = async () => {
  try {
    await sequelize.authenticate()
    await sequelize.sync({ alter: true })

    const [clinicaGeneral] = await Specialty.findOrCreate({
      where: { name: 'Clinica General' },
      defaults: {
        description: 'Atencion clinica integral',
        fee: 15000,
        isActive: true
      }
    })
    await Specialty.findOrCreate({
      where: { name: 'Cardiologia' },
      defaults: {
        description: 'Atencion cardiovascular',
        fee: 22000,
        isActive: true
      }
    })

    const [doctor] = await Doctor.findOrCreate({
      where: { email: 'medico@mail.com' },
      defaults: {
        fullName: 'Dr. Juan Perez',
        email: 'medico@mail.com',
        phone: '+5492604000000',
        specialtyId: clinicaGeneral.id,
        bio: 'Medico clinico',
        isActive: true
      }
    })

    const countAvailability = await DoctorAvailability.count({
      where: {
        doctorId: doctor.id
      }
    })
    if (countAvailability === 0) {
      await DoctorAvailability.bulkCreate([
        { doctorId: doctor.id, dayOfWeek: 1, startTime: '09:00', endTime: '13:00', slotMinutes: 30, isActive: true },
        { doctorId: doctor.id, dayOfWeek: 3, startTime: '14:00', endTime: '18:00', slotMinutes: 30, isActive: true },
        { doctorId: doctor.id, dayOfWeek: 5, startTime: '09:00', endTime: '12:00', slotMinutes: 30, isActive: true }
      ])
    }

    await upsertUser({ role: 'admin', email: 'admin@mail.com', password: 'admin' })
    await upsertUser({ role: 'clinic', email: 'clinica@mail.com', password: 'clinica' })
    await upsertUser({ role: 'doctor', email: 'medico@mail.com', password: 'medico', doctorId: doctor.id })

    logger.info('Seed completado')
    process.exit(0)
  } catch (error) {
    logger.error({ err: error }, 'Seed error')
    process.exit(1)
  }
}

run()

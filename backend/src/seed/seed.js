import bcrypt from 'bcryptjs'
import { sequelize } from '../config/database.js'
import {
  Specialty,
  HealthInsurance,
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

const run = async () => {
  try {
    await sequelize.authenticate()
    await sequelize.sync({ alter: true })

    const clinicaGeneral = await upsertParanoid(
      Specialty,
      { name: 'Clinica General' },
      {
        name: 'Clinica General',
        description: 'Atencion clinica integral',
        fee: 15000,
        isActive: true
      }
    )
    await upsertParanoid(
      Specialty,
      { name: 'Cardiologia' },
      {
        name: 'Cardiologia',
        description: 'Atencion cardiovascular',
        fee: 22000,
        isActive: true
      }
    )

    await upsertParanoid(
      HealthInsurance,
      { name: 'OSEP' },
      {
        name: 'OSEP',
        discountPercent: 20,
        isActive: true
      }
    )

    const doctor = await upsertParanoid(
      Doctor,
      { email: 'medico@mail.com' },
      {
        fullName: 'Dr. Juan Perez',
        email: 'medico@mail.com',
        phone: '+5492604000000',
        dni: '30111222',
        consultorio: 101,
        specialtyId: clinicaGeneral.id,
        bio: 'Medico clinico',
        isActive: true
      }
    )

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
    await upsertUser({ role: 'doctor', email: 'medico@mail.com', password: doctor.dni, doctorId: doctor.id })

    logger.info('Seed completado')
    process.exit(0)
  } catch (error) {
    logger.error({ err: error }, 'Seed error')
    process.exit(1)
  }
}

run()

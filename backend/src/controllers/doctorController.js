import bcrypt from 'bcryptjs'
import { Op } from 'sequelize'
import { z } from 'zod'
import {
  Doctor,
  Specialty,
  DoctorAvailability,
  DoctorBlock,
  User,
  sequelize
} from '../db/models/index.js'
import { AppError } from '../utils/errors.js'
import { ok, paginated } from '../utils/response.js'
import { parsePagination, buildPagination } from '../utils/pagination.js'
import { writeAuditLog } from '../utils/audit.js'

const availabilityItemSchema = z.object({
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  endTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  slotMinutes: z.coerce.number().int().min(10).max(120).default(30),
  isActive: z.boolean().default(true)
})

export const listDoctorsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    pageSize: z.coerce.number().int().positive().optional(),
    specialtyId: z.string().uuid().optional(),
    search: z.string().optional(),
    isActive: z.enum(['true', 'false']).optional()
  }).optional()
})

export const doctorIdParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid()
  })
})

export const createDoctorSchema = z.object({
  body: z.object({
    fullName: z.string().min(3).max(120),
    email: z.string().email(),
    phone: z.string().min(8).max(20),
    dni: z.string().regex(/^\d{6,12}$/),
    consultorio: z.coerce.number().int().positive(),
    specialtyId: z.string().uuid(),
    bio: z.string().max(2000).optional(),
    isActive: z.boolean().optional()
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional()
})

export const updateDoctorSchema = z.object({
  body: z.object({
    fullName: z.string().min(3).max(120).optional(),
    email: z.string().email().optional(),
    phone: z.string().min(8).max(20).optional(),
    dni: z.string().regex(/^\d{6,12}$/).optional(),
    consultorio: z.coerce.number().int().positive().optional(),
    specialtyId: z.string().uuid().optional(),
    bio: z.string().max(2000).optional().nullable(),
    isActive: z.boolean().optional()
  }).refine((value) => Object.keys(value).length > 0, 'Sin campos para actualizar'),
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid()
  })
})

export const updateAvailabilitySchema = z.object({
  body: z.object({
    availability: z.array(availabilityItemSchema).min(1)
  }),
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid()
  })
})

export const createBlockSchema = z.object({
  body: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    startTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
    endTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
    reason: z.string().max(250).optional()
  }),
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid()
  })
})

export const deleteBlockSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid(),
    blockId: z.string().uuid()
  })
})

const ensureDoctorReadPermission = (auth, doctorId) => {
  if (!auth) {
    throw new AppError('No autorizado', 401, 'unauthorized')
  }
  if (auth.role === 'admin' || auth.role === 'clinic') {
    return
  }
  if (auth.role === 'doctor' && auth.doctorId === doctorId) {
    return
  }
  throw new AppError('Prohibido', 403, 'forbidden')
}

const normalizeDni = (value) => String(value).replace(/\D/g, '')
const maskDni = (dni) => `***${String(dni).slice(-4)}`

export const listDoctors = async (req, res) => {
  const { query = {} } = req.validated
  const { page, pageSize, offset, limit } = parsePagination(query)

  const where = {}
  if (query.specialtyId) {
    where.specialtyId = query.specialtyId
  }
  if (query.search) {
    where.fullName = {
      [Op.iLike]: `%${query.search.trim()}%`
    }
  }
  if (query.isActive) {
    where.isActive = query.isActive === 'true'
  } else if (!req.auth) {
    where.isActive = true
  }

  const { rows, count } = await Doctor.findAndCountAll({
    where,
    include: [
      {
        model: Specialty,
        as: 'specialty'
      }
    ],
    order: [['fullName', 'ASC']],
    offset,
    limit
  })

  paginated(res, rows, buildPagination({ page, pageSize, total: count }))
}

export const getDoctorById = async (req, res) => {
  const doctor = await Doctor.findByPk(req.validated.params.id, {
    include: [
      {
        model: Specialty,
        as: 'specialty'
      }
    ]
  })
  if (!doctor) {
    throw new AppError('Medico no encontrado', 404, 'doctor_not_found')
  }

  ok(res, doctor)
}

export const createDoctor = async (req, res) => {
  const payload = {
    ...req.validated.body,
    dni: normalizeDni(req.validated.body.dni)
  }

  let doctor
  try {
    await sequelize.transaction(async (transaction) => {
      doctor = await Doctor.create(payload, { transaction })

      const passwordHash = await bcrypt.hash(payload.dni, 10)
      await User.create(
        {
          role: 'doctor',
          email: payload.email,
          passwordHash,
          doctorId: doctor.id,
          isActive: payload.isActive ?? true
        },
        { transaction }
      )

      await writeAuditLog({
        actorRole: req.auth.role,
        actorId: req.auth.sub,
        action: 'DOCTOR_CREATED',
        entity: 'Doctor',
        entityId: doctor.id,
        meta: {
          ...payload,
          dni: maskDni(payload.dni)
        },
        transaction
      })
    })
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      throw new AppError('Ya existe un medico o usuario con ese email/DNI', 409, 'doctor_conflict')
    }
    throw error
  }

  ok(res, doctor, 'doctor_created', 201)
}

export const updateDoctor = async (req, res) => {
  const patch = { ...req.validated.body }
  if (patch.dni) {
    patch.dni = normalizeDni(patch.dni)
  }

  let doctor
  try {
    await sequelize.transaction(async (transaction) => {
      doctor = await Doctor.findByPk(req.validated.params.id, { transaction })
      if (!doctor) {
        throw new AppError('Medico no encontrado', 404, 'doctor_not_found')
      }
      await doctor.update(patch, { transaction })

      const doctorUser = await User.findOne({
        where: {
          doctorId: doctor.id,
          role: 'doctor'
        },
        transaction
      })

      if (doctorUser) {
        const userPatch = {}
        if (patch.email) userPatch.email = patch.email
        if (typeof patch.isActive === 'boolean') userPatch.isActive = patch.isActive
        if (patch.dni) {
          userPatch.passwordHash = await bcrypt.hash(patch.dni, 10)
        }
        if (Object.keys(userPatch).length > 0) {
          await doctorUser.update(userPatch, { transaction })
        }
      }

      await writeAuditLog({
        actorRole: req.auth.role,
        actorId: req.auth.sub,
        action: 'DOCTOR_UPDATED',
        entity: 'Doctor',
        entityId: doctor.id,
        meta: {
          ...patch,
          ...(patch.dni ? { dni: maskDni(patch.dni) } : {})
        },
        transaction
      })
    })
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      throw new AppError('Ya existe un medico o usuario con ese email/DNI', 409, 'doctor_conflict')
    }
    throw error
  }

  ok(res, doctor, 'doctor_updated')
}

export const deleteDoctor = async (req, res) => {
  const doctor = await Doctor.findByPk(req.validated.params.id)
  if (!doctor) {
    throw new AppError('Medico no encontrado', 404, 'doctor_not_found')
  }
  await doctor.destroy()

  await writeAuditLog({
    actorRole: req.auth.role,
    actorId: req.auth.sub,
    action: 'DOCTOR_DELETED',
    entity: 'Doctor',
    entityId: doctor.id
  })

  ok(res, { id: doctor.id }, 'doctor_deleted')
}

export const getDoctorAvailability = async (req, res) => {
  const doctorId = req.validated.params.id
  ensureDoctorReadPermission(req.auth, doctorId)

  const [availability, blocks] = await Promise.all([
    DoctorAvailability.findAll({
      where: { doctorId },
      order: [['dayOfWeek', 'ASC'], ['startTime', 'ASC']]
    }),
    DoctorBlock.findAll({
      where: { doctorId },
      order: [['date', 'ASC'], ['startTime', 'ASC']]
    })
  ])

  ok(res, { availability, blocks })
}

export const putDoctorAvailability = async (req, res) => {
  const doctorId = req.validated.params.id
  await sequelize.transaction(async (transaction) => {
    await DoctorAvailability.destroy({ where: { doctorId }, transaction })
    await DoctorAvailability.bulkCreate(
      req.validated.body.availability.map((item) => ({
        doctorId,
        ...item
      })),
      { transaction }
    )
  })

  await writeAuditLog({
    actorRole: req.auth.role,
    actorId: req.auth.sub,
    action: 'DOCTOR_AVAILABILITY_REPLACED',
    entity: 'Doctor',
    entityId: doctorId,
    meta: { count: req.validated.body.availability.length }
  })

  const availability = await DoctorAvailability.findAll({
    where: { doctorId },
    order: [['dayOfWeek', 'ASC'], ['startTime', 'ASC']]
  })
  ok(res, availability, 'doctor_availability_updated')
}

export const createDoctorBlock = async (req, res) => {
  const doctorId = req.validated.params.id
  const block = await DoctorBlock.create({
    doctorId,
    ...req.validated.body,
    createdByRole: req.auth.role,
    createdByUserId: req.auth.sub
  })

  await writeAuditLog({
    actorRole: req.auth.role,
    actorId: req.auth.sub,
    action: 'DOCTOR_BLOCK_CREATED',
    entity: 'DoctorBlock',
    entityId: block.id,
    meta: {
      doctorId,
      date: block.date,
      startTime: block.startTime,
      endTime: block.endTime
    }
  })

  ok(res, block, 'doctor_block_created', 201)
}

export const deleteDoctorBlock = async (req, res) => {
  const { id: doctorId, blockId } = req.validated.params
  const block = await DoctorBlock.findOne({
    where: {
      id: blockId,
      doctorId
    }
  })

  if (!block) {
    throw new AppError('Bloqueo no encontrado', 404, 'doctor_block_not_found')
  }

  await block.destroy()

  await writeAuditLog({
    actorRole: req.auth.role,
    actorId: req.auth.sub,
    action: 'DOCTOR_BLOCK_DELETED',
    entity: 'DoctorBlock',
    entityId: blockId
  })

  ok(res, { id: blockId }, 'doctor_block_deleted')
}

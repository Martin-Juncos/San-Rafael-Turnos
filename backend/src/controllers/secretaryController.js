import bcrypt from 'bcryptjs'
import { Op } from 'sequelize'
import { z } from 'zod'
import { User, Doctor, sequelize } from '../db/models/index.js'
import { AppError } from '../utils/errors.js'
import { ok, paginated } from '../utils/response.js'
import { parsePagination, buildPagination } from '../utils/pagination.js'
import { writeAuditLog } from '../utils/audit.js'
import { dniSchema, phoneSchema, normalizeDni, normalizePhone } from '../validators/common.js'

export const listSecretariesSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    pageSize: z.coerce.number().int().positive().optional(),
    doctorId: z.string().uuid().optional(),
    search: z.string().optional(),
    isActive: z.enum(['true', 'false']).optional()
  }).optional()
})

export const createSecretarySchema = z.object({
  body: z.object({
    fullName: z.string().min(3).max(120),
    email: z.string().email(),
    phone: phoneSchema,
    dni: dniSchema,
    doctorId: z.string().uuid().optional(),
    doctorIds: z.array(z.string().uuid()).min(1).optional(),
    isActive: z.boolean().optional()
  }).refine((value) => Boolean(value.doctorId) || Boolean(value.doctorIds?.length), 'Debe vincular al menos un medico'),
  query: z.object({}).optional(),
  params: z.object({}).optional()
})

export const secretaryIdSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid()
  })
})

export const updateSecretarySchema = z.object({
  body: z.object({
    fullName: z.string().min(3).max(120).optional(),
    email: z.string().email().optional(),
    phone: phoneSchema.optional(),
    dni: dniSchema.optional(),
    doctorId: z.string().uuid().optional(),
    doctorIds: z.array(z.string().uuid()).min(1).optional(),
    isActive: z.boolean().optional()
  }).refine((value) => Object.keys(value).length > 0, 'Sin campos para actualizar'),
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid()
  })
})

const secretaryInclude = [{
  model: Doctor,
  as: 'linkedDoctors',
  through: { attributes: [] }
}]

const normalizeLinkedDoctorIds = ({ doctorId, doctorIds }) => {
  return Array.from(
    new Set([
      ...(Array.isArray(doctorIds) ? doctorIds : []),
      ...(doctorId ? [doctorId] : [])
    ].filter(Boolean))
  )
}

const assertDoctorsExist = async (doctorIds, transaction) => {
  const doctors = await Doctor.findAll({
    where: { id: doctorIds },
    transaction
  })

  if (doctors.length !== doctorIds.length) {
    throw new AppError('Uno o mas medicos no fueron encontrados', 404, 'doctor_not_found')
  }

  return doctors
}

export const listSecretaries = async (req, res) => {
  const { query = {} } = req.validated
  const { page, pageSize, offset, limit } = parsePagination(query)

  const where = {
    role: 'secretary',
    accountType: 'secretary'
  }
  if (query.isActive) {
    where.isActive = query.isActive === 'true'
  }
  if (query.search) {
    where[Op.or] = [
      { fullName: { [Op.iLike]: `%${query.search.trim()}%` } },
      { email: { [Op.iLike]: `%${query.search.trim()}%` } },
      { dni: { [Op.iLike]: `%${query.search.trim()}%` } }
    ]
  }

  const { rows, count } = await User.findAndCountAll({
    where,
    attributes: { exclude: ['passwordHash'] },
    include: [{
      model: Doctor,
      as: 'linkedDoctors',
      through: { attributes: [] },
      ...(query.doctorId
        ? {
            where: { id: query.doctorId },
            required: true
          }
        : {})
    }],
    order: [['fullName', 'ASC'], ['email', 'ASC']],
    distinct: true,
    offset,
    limit
  })

  paginated(res, rows, buildPagination({ page, pageSize, total: count }))
}

export const createSecretary = async (req, res) => {
  const linkedDoctorIds = normalizeLinkedDoctorIds(req.validated.body)
  const payload = {
    ...req.validated.body,
    fullName: req.validated.body.fullName.trim(),
    phone: normalizePhone(req.validated.body.phone),
    dni: normalizeDni(req.validated.body.dni),
    doctorIds: linkedDoctorIds
  }

  const passwordHash = await bcrypt.hash(payload.dni, 10)

  let item
  try {
    await sequelize.transaction(async (transaction) => {
      await assertDoctorsExist(payload.doctorIds, transaction)

      item = await User.create({
        role: 'secretary',
        accountType: 'secretary',
        email: payload.email,
        passwordHash,
        doctorId: null,
        fullName: payload.fullName,
        phone: payload.phone,
        dni: payload.dni,
        isActive: payload.isActive ?? true
      }, { transaction })

      await item.setLinkedDoctors(payload.doctorIds, { transaction })
    })
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      throw new AppError('Ya existe un usuario con ese correo', 409, 'secretary_conflict')
    }
    throw error
  }

  await writeAuditLog({
    actorRole: req.auth.role,
    actorId: req.auth.sub,
    action: 'SECRETARY_CREATED',
    entity: 'User',
    entityId: item.id,
    meta: {
      accountType: 'secretary',
      doctorIds: payload.doctorIds,
      email: item.email,
      fullName: item.fullName
    }
  })

  const created = await User.findByPk(item.id, {
    attributes: { exclude: ['passwordHash'] },
    include: secretaryInclude
  })

  ok(res, created, 'secretary_created', 201)
}

export const updateSecretary = async (req, res) => {
  const item = await User.findOne({
    where: {
      id: req.validated.params.id,
      role: 'secretary',
      accountType: 'secretary'
    }
  })
  if (!item) {
    throw new AppError('Secretaria no encontrada', 404, 'secretary_not_found')
  }

  const patch = { ...req.validated.body }
  if (patch.fullName) patch.fullName = patch.fullName.trim()
  if (patch.phone) patch.phone = normalizePhone(patch.phone)
  if (patch.dni) patch.dni = normalizeDni(patch.dni)
  const linkedDoctorIds = normalizeLinkedDoctorIds(patch)

  if (patch.dni) {
    patch.passwordHash = await bcrypt.hash(patch.dni, 10)
  }

  delete patch.doctorId
  delete patch.doctorIds

  try {
    await sequelize.transaction(async (transaction) => {
      if (linkedDoctorIds.length > 0) {
        await assertDoctorsExist(linkedDoctorIds, transaction)
      }

      await item.update(patch, { transaction })

      if (linkedDoctorIds.length > 0) {
        await item.setLinkedDoctors(linkedDoctorIds, { transaction })
      }
    })
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      throw new AppError('Ya existe un usuario con ese correo', 409, 'secretary_conflict')
    }
    throw error
  }

  await writeAuditLog({
    actorRole: req.auth.role,
    actorId: req.auth.sub,
    action: 'SECRETARY_UPDATED',
    entity: 'User',
    entityId: item.id,
    meta: {
      accountType: 'secretary',
      ...(linkedDoctorIds.length > 0 ? { doctorIds: linkedDoctorIds } : {}),
      ...patch,
      ...(patch.passwordHash ? { passwordHash: '[redacted]' } : {})
    }
  })

  const updated = await User.findByPk(item.id, {
    attributes: { exclude: ['passwordHash'] },
    include: secretaryInclude
  })

  ok(res, updated, 'secretary_updated')
}

export const deleteSecretary = async (req, res) => {
  const item = await User.findOne({
    where: {
      id: req.validated.params.id,
      role: 'secretary',
      accountType: 'secretary'
    }
  })
  if (!item) {
    throw new AppError('Secretaria no encontrada', 404, 'secretary_not_found')
  }

  await item.destroy()

  await writeAuditLog({
    actorRole: req.auth.role,
    actorId: req.auth.sub,
    action: 'SECRETARY_DELETED',
    entity: 'User',
    entityId: item.id,
    meta: { accountType: 'secretary' }
  })

  ok(res, { id: item.id }, 'secretary_deleted')
}

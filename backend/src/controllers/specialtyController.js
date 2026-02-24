import { Op } from 'sequelize'
import { z } from 'zod'
import { Specialty } from '../db/models/index.js'
import { AppError } from '../utils/errors.js'
import { ok, paginated } from '../utils/response.js'
import { parsePagination, buildPagination } from '../utils/pagination.js'
import { writeAuditLog } from '../utils/audit.js'

export const listSpecialtiesSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    pageSize: z.coerce.number().int().positive().optional(),
    search: z.string().optional(),
    isActive: z.enum(['true', 'false']).optional()
  }).optional()
})

export const createSpecialtySchema = z.object({
  body: z.object({
    name: z.string().min(2).max(80),
    description: z.string().max(1000).optional(),
    fee: z.coerce.number().min(0).optional(),
    isActive: z.boolean().optional()
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional()
})

export const updateSpecialtySchema = z.object({
  body: z.object({
    name: z.string().min(2).max(80).optional(),
    description: z.string().max(1000).optional().nullable(),
    fee: z.coerce.number().min(0).optional(),
    isActive: z.boolean().optional()
  }).refine((value) => Object.keys(value).length > 0, 'Sin campos para actualizar'),
  params: z.object({
    id: z.string().uuid()
  }),
  query: z.object({}).optional()
})

export const idParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid()
  })
})

export const listSpecialties = async (req, res) => {
  const { query = {} } = req.validated
  const { page, pageSize, offset, limit } = parsePagination(query)
  const where = {}
  if (query.search) {
    where.name = {
      [Op.iLike]: `%${query.search.trim()}%`
    }
  }
  if (query.isActive) {
    where.isActive = query.isActive === 'true'
  } else if (!req.auth) {
    where.isActive = true
  }

  const { rows, count } = await Specialty.findAndCountAll({
    where,
    order: [['name', 'ASC']],
    offset,
    limit
  })

  paginated(res, rows, buildPagination({ page, pageSize, total: count }))
}

export const createSpecialty = async (req, res) => {
  const item = await Specialty.create(req.validated.body)

  await writeAuditLog({
    actorRole: req.auth.role,
    actorId: req.auth.sub,
    action: 'SPECIALTY_CREATED',
    entity: 'Specialty',
    entityId: item.id,
    meta: req.validated.body
  })

  ok(res, item, 'specialty_created', 201)
}

export const updateSpecialty = async (req, res) => {
  const item = await Specialty.findByPk(req.validated.params.id)
  if (!item) {
    throw new AppError('Especialidad no encontrada', 404, 'specialty_not_found')
  }

  await item.update(req.validated.body)

  await writeAuditLog({
    actorRole: req.auth.role,
    actorId: req.auth.sub,
    action: 'SPECIALTY_UPDATED',
    entity: 'Specialty',
    entityId: item.id,
    meta: req.validated.body
  })

  ok(res, item, 'specialty_updated')
}

export const deleteSpecialty = async (req, res) => {
  const item = await Specialty.findByPk(req.validated.params.id)
  if (!item) {
    throw new AppError('Especialidad no encontrada', 404, 'specialty_not_found')
  }

  await item.destroy()

  await writeAuditLog({
    actorRole: req.auth.role,
    actorId: req.auth.sub,
    action: 'SPECIALTY_DELETED',
    entity: 'Specialty',
    entityId: item.id
  })

  ok(res, { id: item.id }, 'specialty_deleted')
}

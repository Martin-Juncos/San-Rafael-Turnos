import { Op } from 'sequelize'
import { z } from 'zod'
import { HealthInsurance } from '../db/models/index.js'
import { AppError } from '../utils/errors.js'
import { ok, paginated } from '../utils/response.js'
import { parsePagination, buildPagination } from '../utils/pagination.js'
import { writeAuditLog } from '../utils/audit.js'

export const listInsurancesSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    pageSize: z.coerce.number().int().positive().optional(),
    search: z.string().optional(),
    isActive: z.enum(['true', 'false']).optional()
  }).optional()
})

export const createInsuranceSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(120),
    discountPercent: z.coerce.number().min(0).max(100),
    isActive: z.boolean().optional()
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional()
})

export const updateInsuranceSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(120).optional(),
    discountPercent: z.coerce.number().min(0).max(100).optional(),
    isActive: z.boolean().optional()
  }).refine((value) => Object.keys(value).length > 0, 'Sin campos para actualizar'),
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid()
  })
})

export const insuranceIdSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid()
  })
})

export const listInsurances = async (req, res) => {
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

  const { rows, count } = await HealthInsurance.findAndCountAll({
    where,
    order: [['name', 'ASC']],
    offset,
    limit
  })

  paginated(res, rows, buildPagination({ page, pageSize, total: count }))
}

export const createInsurance = async (req, res) => {
  const item = await HealthInsurance.create(req.validated.body)

  await writeAuditLog({
    actorRole: req.auth.role,
    actorId: req.auth.sub,
    action: 'INSURANCE_CREATED',
    entity: 'HealthInsurance',
    entityId: item.id,
    meta: req.validated.body
  })

  ok(res, item, 'insurance_created', 201)
}

export const updateInsurance = async (req, res) => {
  const item = await HealthInsurance.findByPk(req.validated.params.id)
  if (!item) {
    throw new AppError('Obra social no encontrada', 404, 'insurance_not_found')
  }

  await item.update(req.validated.body)

  await writeAuditLog({
    actorRole: req.auth.role,
    actorId: req.auth.sub,
    action: 'INSURANCE_UPDATED',
    entity: 'HealthInsurance',
    entityId: item.id,
    meta: req.validated.body
  })

  ok(res, item, 'insurance_updated')
}

export const deleteInsurance = async (req, res) => {
  const item = await HealthInsurance.findByPk(req.validated.params.id)
  if (!item) {
    throw new AppError('Obra social no encontrada', 404, 'insurance_not_found')
  }

  await item.destroy()

  await writeAuditLog({
    actorRole: req.auth.role,
    actorId: req.auth.sub,
    action: 'INSURANCE_DELETED',
    entity: 'HealthInsurance',
    entityId: item.id
  })

  ok(res, { id: item.id }, 'insurance_deleted')
}

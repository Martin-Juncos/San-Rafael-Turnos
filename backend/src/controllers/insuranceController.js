import { Op } from 'sequelize'
import { z } from 'zod'
import { HealthInsurance, sequelize } from '../db/models/index.js'
import { AppError } from '../utils/errors.js'
import { ok, paginated } from '../utils/response.js'
import { parsePagination, buildPagination } from '../utils/pagination.js'
import { writeAuditLog } from '../utils/audit.js'

const normalizeInsuranceName = (value) => String(value ?? '').trim().replace(/\s+/g, ' ')
let insuranceUniquenessEnsured = false

const ensureInsuranceUniquenessRule = async () => {
  if (insuranceUniquenessEnsured) {
    return
  }

  await sequelize.query(`
    ALTER TABLE "HealthInsurance"
    DROP CONSTRAINT IF EXISTS "HealthInsurance_name_key";
  `)
  await sequelize.query(`
    DROP INDEX IF EXISTS "healthinsurance_name_key";
  `)
  await sequelize.query(`
    DROP INDEX IF EXISTS "healthinsurance_unique_name_discount_active";
  `)
  await sequelize.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS "healthinsurance_unique_name_discount_active"
    ON "HealthInsurance" (LOWER("name"), "discountPercent")
    WHERE "deletedAt" IS NULL;
  `)

  insuranceUniquenessEnsured = true
}

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
  try {
    await ensureInsuranceUniquenessRule()
  } catch (_error) {}

  const payload = {
    ...req.validated.body,
    name: normalizeInsuranceName(req.validated.body.name)
  }

  const existingSameNameAndDiscount = await HealthInsurance.findOne({
    where: {
      name: {
        [Op.iLike]: payload.name
      },
      discountPercent: payload.discountPercent
    },
    paranoid: false
  })

  if (existingSameNameAndDiscount) {
    if (existingSameNameAndDiscount.deletedAt) {
      await existingSameNameAndDiscount.restore()
      await existingSameNameAndDiscount.update({
        name: payload.name,
        discountPercent: payload.discountPercent,
        isActive: payload.isActive ?? true
      })

      await writeAuditLog({
        actorRole: req.auth.role,
        actorId: req.auth.sub,
        action: 'INSURANCE_RESTORED',
        entity: 'HealthInsurance',
        entityId: existingSameNameAndDiscount.id,
        meta: payload
      })

      ok(res, existingSameNameAndDiscount, 'insurance_restored')
      return
    }

    throw new AppError('Ya existe una obra social con ese nombre y porcentaje', 409, 'insurance_conflict')
  }

  let item
  try {
    item = await HealthInsurance.create(payload)
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      throw new AppError('Ya existe una obra social con ese nombre y porcentaje', 409, 'insurance_conflict')
    }
    throw error
  }

  await writeAuditLog({
    actorRole: req.auth.role,
    actorId: req.auth.sub,
    action: 'INSURANCE_CREATED',
    entity: 'HealthInsurance',
    entityId: item.id,
    meta: payload
  })

  ok(res, item, 'insurance_created', 201)
}

export const updateInsurance = async (req, res) => {
  try {
    await ensureInsuranceUniquenessRule()
  } catch (_error) {}

  const item = await HealthInsurance.findByPk(req.validated.params.id)
  if (!item) {
    throw new AppError('Obra social no encontrada', 404, 'insurance_not_found')
  }

  const patch = { ...req.validated.body }
  if (patch.name) {
    patch.name = normalizeInsuranceName(patch.name)
  }

  const targetName = patch.name || item.name
  const targetDiscountPercent =
    typeof patch.discountPercent !== 'undefined'
      ? patch.discountPercent
      : item.discountPercent

  const duplicate = await HealthInsurance.findOne({
    where: {
      id: {
        [Op.ne]: item.id
      },
      name: {
        [Op.iLike]: targetName
      },
      discountPercent: targetDiscountPercent
    }
  })

  if (duplicate) {
    throw new AppError('Ya existe una obra social con ese nombre y porcentaje', 409, 'insurance_conflict')
  }

  try {
    await item.update(patch)
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      throw new AppError('Ya existe una obra social con ese nombre y porcentaje', 409, 'insurance_conflict')
    }
    throw error
  }

  await writeAuditLog({
    actorRole: req.auth.role,
    actorId: req.auth.sub,
    action: 'INSURANCE_UPDATED',
    entity: 'HealthInsurance',
    entityId: item.id,
    meta: patch
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

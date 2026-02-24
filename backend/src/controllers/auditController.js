import { Op } from 'sequelize'
import { z } from 'zod'
import { AuditLog } from '../db/models/index.js'
import { paginated } from '../utils/response.js'
import { parsePagination, buildPagination } from '../utils/pagination.js'

export const listAuditLogsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    pageSize: z.coerce.number().int().positive().optional(),
    entity: z.string().optional(),
    action: z.string().optional()
  }).optional()
})

export const listAuditLogs = async (req, res) => {
  const { query = {} } = req.validated
  const { page, pageSize, offset, limit } = parsePagination(query)

  const where = {}
  if (query.entity) {
    where.entity = query.entity
  }
  if (query.action) {
    where.action = {
      [Op.iLike]: `%${query.action}%`
    }
  }

  const { rows, count } = await AuditLog.findAndCountAll({
    where,
    order: [['createdAt', 'DESC']],
    offset,
    limit
  })

  paginated(res, rows, buildPagination({ page, pageSize, total: count }))
}

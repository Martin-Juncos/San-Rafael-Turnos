import { z } from 'zod'
import { getNewsById as getNewsByIdService, listNews as listNewsService } from '../services/newsService.js'
import { ok } from '../utils/response.js'

export const listNewsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}).optional(),
  query: z.object({
    limit: z.coerce.number().int().min(1).max(30).optional()
  }).optional()
})

export const listNews = async (req, res) => {
  const { query = {} } = req.validated
  const data = await listNewsService({
    limit: query.limit
  })
  ok(res, data, 'news_listed')
}

export const getNewsByIdSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().min(10)
  })
})

export const getNewsById = async (req, res) => {
  const data = await getNewsByIdService(req.validated.params.id)
  ok(res, data, 'news_detail')
}

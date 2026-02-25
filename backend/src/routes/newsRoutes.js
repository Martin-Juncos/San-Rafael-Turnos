import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler.js'
import { validate } from '../middlewares/validate.js'
import { getNewsById, getNewsByIdSchema, listNews, listNewsSchema } from '../controllers/newsController.js'

const router = Router()

router.get('/', validate(listNewsSchema), asyncHandler(listNews))
router.get('/:id', validate(getNewsByIdSchema), asyncHandler(getNewsById))

export default router

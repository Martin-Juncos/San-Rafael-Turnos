import { AppError } from '../utils/errors.js'

export const validate = (schema) => (req, _res, next) => {
  const result = schema.safeParse({
    body: req.body,
    query: req.query,
    params: req.params
  })

  if (!result.success) {
    return next(new AppError('Datos invalidos', 400, 'validation_error', result.error.flatten()))
  }

  req.validated = result.data
  return next()
}

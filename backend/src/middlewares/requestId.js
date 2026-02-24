import { randomUUID } from 'crypto'

export const requestIdMiddleware = (req, res, next) => {
  const requestId = req.headers['x-request-id'] || randomUUID()
  req.requestId = requestId
  res.setHeader('x-request-id', requestId)
  next()
}

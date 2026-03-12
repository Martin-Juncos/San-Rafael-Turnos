import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import swaggerUi from 'swagger-ui-express'
import { config } from './config/env.js'
import { requestIdMiddleware } from './middlewares/requestId.js'
import { httpLogger, requestLogMiddleware } from './middlewares/httpLogger.js'
import { globalLimiter } from './middlewares/rateLimiters.js'
import { notFoundHandler, errorHandler } from './middlewares/errorHandler.js'
import { openapiDocument } from './docs/openapi.js'
import apiRoutes from './routes/index.js'

export const app = express()

app.use(requestIdMiddleware)
app.use(httpLogger)
app.use(helmet())
app.use(
  cors({
    origin: config.CORS_ORIGINS,
    credentials: true
  })
)
app.use(express.json({
  limit: '1mb',
  verify: (req, _res, buffer) => {
    req.rawBody = buffer.toString('utf8')
  }
}))
app.use(globalLimiter)
app.use(requestLogMiddleware)

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    name: 'san-rafael-turnos-backend',
    status: 'up',
    timestamp: new Date().toISOString()
  })
})

app.get('/api/openapi.json', (_req, res) => {
  res.json(openapiDocument)
})
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapiDocument))
app.use('/api', apiRoutes)

app.use(notFoundHandler)
app.use(errorHandler)

import 'dotenv/config'
import { z } from 'zod'

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL es requerido'),
  DB_SYNC: z.coerce.boolean().default(true),
  JWT_ACCESS_SECRET: z.string().min(16, 'JWT_ACCESS_SECRET debe tener al menos 16 caracteres'),
  JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET debe tener al menos 16 caracteres'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_DAYS: z.coerce.number().int().positive().default(7),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(200),
  WHATSAPP_PROVIDER: z.enum(['mock']).default('mock'),
  WHATSAPP_FROM_NUMBER: z.string().optional().default(''),
  OTP_TTL_SECONDS: z.coerce.number().int().min(60).max(1800).default(300),
  APPOINTMENT_HOLD_MINUTES: z.coerce.number().int().min(1).max(60).default(10),
  PAYMENT_DEFAULT_CURRENCY: z.string().default('ARS'),
  PATIENT_MESSAGE_WINDOW_HOURS: z.coerce.number().int().min(1).max(240).default(72)
})

const parsed = schema.safeParse(process.env)

if (!parsed.success) {
  const issues = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('\n')
  throw new Error(`Configuracion invalida:\n${issues}`)
}

const origins = parsed.data.CORS_ORIGIN.split(',')
  .map((value) => value.trim())
  .filter(Boolean)

export const config = {
  ...parsed.data,
  CORS_ORIGINS: origins,
  IS_PROD: parsed.data.NODE_ENV === 'production'
}

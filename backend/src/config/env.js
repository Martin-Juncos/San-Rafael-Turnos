import 'dotenv/config'
import { z } from 'zod'

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL es requerido'),
  JWT_ACCESS_SECRET: z.string().min(16, 'JWT_ACCESS_SECRET debe tener al menos 16 caracteres'),
  JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET debe tener al menos 16 caracteres'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_DAYS: z.coerce.number().int().positive().default(7),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  FRONTEND_PUBLIC_URL: z.string().url().default('http://localhost:5173'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(200),
  WHATSAPP_PROVIDER: z.enum(['mock']).default('mock'),
  WHATSAPP_FROM_NUMBER: z.string().optional().default(''),
  MERCADOPAGO_ACCESS_TOKEN: z.string().optional().default(''),
  MERCADOPAGO_WEBHOOK_SECRET: z.string().optional().default(''),
  MERCADOPAGO_WEBHOOK_URL: z.string().optional().default(''),
  NEWS_SOURCE_URL: z.string().url().default('https://tn.com.ar/salud/'),
  NEWS_CACHE_TTL_MINUTES: z.coerce.number().int().min(5).max(1440).default(30),
  NEWS_FETCH_TIMEOUT_MS: z.coerce.number().int().min(2000).max(20000).default(9000),
  NEWS_MAX_ITEMS: z.coerce.number().int().min(5).max(50).default(30),
  OTP_TTL_SECONDS: z.coerce.number().int().min(60).max(1800).default(300),
  APPOINTMENT_HOLD_MINUTES: z.coerce.number().int().min(1).max(60).default(10),
  HOLD_EXPIRATION_JOB_INTERVAL_MINUTES: z.coerce.number().int().min(1).max(5).default(1),
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

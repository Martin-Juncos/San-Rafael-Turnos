import { z } from 'zod'

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/
const TIME_HHMM_REGEX = /^\d{2}:\d{2}$/
const TIME_WITH_OPTIONAL_SECONDS_REGEX = /^\d{2}:\d{2}(:\d{2})?$/

export const normalizeDni = (value) => String(value ?? '').replace(/\D/g, '')
export const normalizePhone = (value) => String(value ?? '').replace(/[^\d+]/g, '')

export const dniSchema = z
  .string()
  .transform((value) => normalizeDni(value))
  .refine((value) => value.length >= 6 && value.length <= 12, 'DNI invalido')

export const phoneSchema = z
  .string()
  .transform((value) => normalizePhone(value))
  .refine((value) => value.length >= 8 && value.length <= 20, 'Telefono invalido')

export const isoDateSchema = z.string().regex(ISO_DATE_REGEX, 'Fecha invalida. Formato esperado: YYYY-MM-DD')
export const hhmmSchema = z.string().regex(TIME_HHMM_REGEX, 'Hora invalida. Formato esperado: HH:mm')
export const hhmmWithOptionalSecondsSchema = z.string().regex(
  TIME_WITH_OPTIONAL_SECONDS_REGEX,
  'Hora invalida. Formato esperado: HH:mm o HH:mm:ss'
)

export const optionalPaginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional()
}).optional()

import { MercadoPagoConfig, Preference, Payment } from 'mercadopago'
import { config } from '../config/env.js'
import { AppError } from '../utils/errors.js'

const ensureMercadoPagoEnabled = () => {
  if (!config.MERCADOPAGO_ACCESS_TOKEN) {
    throw new AppError(
      'Mercado Pago no esta configurado en este entorno',
      503,
      'mercadopago_not_configured'
    )
  }
}

const getMercadoPagoClient = () => new MercadoPagoConfig({
  accessToken: config.MERCADOPAGO_ACCESS_TOKEN
})

const resolveMercadoPagoErrorMessage = (error, fallbackMessage) => {
  const causes = Array.isArray(error?.cause) ? error.cause : []
  const causeMessage = causes
    .map((item) => item?.description || item?.message || null)
    .filter(Boolean)
    .join(' | ')

  return causeMessage || error?.message || fallbackMessage
}

const resolveMercadoPagoStatusCode = (error) => {
  const rawStatus = Number(error?.status || error?.statusCode || 0)
  if (!rawStatus) return 400
  return rawStatus >= 500 ? 502 : rawStatus
}

export const createMercadoPagoPreference = async (payload) => {
  ensureMercadoPagoEnabled()
  const preference = new Preference(getMercadoPagoClient())

  try {
    return await preference.create({ body: payload })
  } catch (error) {
    throw new AppError(
      resolveMercadoPagoErrorMessage(error, 'No se pudo crear la preferencia de pago'),
      resolveMercadoPagoStatusCode(error),
      'mercadopago_preference_error'
    )
  }
}

export const getMercadoPagoPaymentById = async (paymentId) => {
  ensureMercadoPagoEnabled()
  const payment = new Payment(getMercadoPagoClient())

  try {
    return await payment.get({ id: paymentId })
  } catch (error) {
    throw new AppError(
      resolveMercadoPagoErrorMessage(error, 'No se pudo consultar el estado del pago'),
      resolveMercadoPagoStatusCode(error),
      'mercadopago_payment_lookup_error'
    )
  }
}

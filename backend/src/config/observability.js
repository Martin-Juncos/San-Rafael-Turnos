import { config } from './env.js'
import { logger } from './logger.js'

let sentryClient = null
let sentryEnabled = false

export const initObservability = async () => {
  if (!config.SENTRY_DSN) {
    return
  }

  try {
    const sentryModule = await import('@sentry/node')
    sentryClient = sentryModule
    sentryClient.init({
      dsn: config.SENTRY_DSN,
      environment: config.SENTRY_ENVIRONMENT,
      tracesSampleRate: config.SENTRY_TRACES_SAMPLE_RATE
    })
    sentryEnabled = true
    logger.info({ environment: config.SENTRY_ENVIRONMENT }, 'sentry-enabled')
  } catch (error) {
    sentryEnabled = false
    logger.warn({ err: error }, 'sentry-not-available')
  }
}

export const captureException = (error, context = {}) => {
  if (!sentryEnabled || !sentryClient) {
    return
  }
  sentryClient.captureException(error, { extra: context })
}

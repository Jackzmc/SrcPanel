import logger from './logger.js'
import * as Sentry from '@sentry/node'

const log = logger.child({ name: 'sentry' })

log.debug({}, 'initalizing sentry ' + process.env.SENTRY_DSN)
Sentry.init({
  //@ts-ignore Their doc says add this but it's not a valid type... stupid
  dsn: process.env.SENTRY_DSN as string,
  tracesSampleRate: 0.01, // 1% of transactions — adjust to your needs
  autoSessionTracking: false, // GlitchTip does not support sessions
  environment: process.env.SENTRY_ENV ?? process.env.NODE_ENV ?? 'development',
  sendDefaultPii: true // Using glitchtip, its ok
});

Sentry.captureMessage("Test message from Node.js");
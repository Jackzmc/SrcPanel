import * as Sentry from '@sentry/nuxt'
export default defineNitroPlugin((nitroApp) => {
  const originalErrorHandler = nitroApp.h3App.options.onError

  nitroApp.h3App.options.onError = (error, event) => {
    Sentry.captureException(error, {
      extra: {
        url: event?.path,
        method: event?.method,
      },
    })
    console.error('[nitro:error]', error)
    if (originalErrorHandler) {
      originalErrorHandler(error, event)
    }
  }
})
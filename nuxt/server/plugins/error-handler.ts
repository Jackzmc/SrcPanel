import * as Sentry from '@sentry/nuxt'
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('error', (error, { event }) => {
    if(error.message.startsWith("Page not found")) return
    console.log(error, event)
    console.error('[nitro:error]', error?.stack ?? error)

    // Only send to Sentry if it's initialized on the server
    // If using @sentry/nuxt, import from there
    try {
      Sentry.captureException(error, {
        extra: {
          url: event?.path,
          method: event?.method,
        },
      })
    } catch (e) {
      console.error('[nitro:error] Sentry capture failed:', e)
    }
  })
})

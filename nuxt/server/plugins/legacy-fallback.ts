import { sendProxy } from 'h3'

// When Nuxt can't find a route, proxy the request to Fastify which serves the old UI
export default defineNitroPlugin((nitroApp) => {
  // nitroApp.hooks.hook('error', async (error, { event }) => {
  //   if (!event) return
  //   if ((error as any).statusCode !== 404) return
  //   if (event.path?.startsWith('/api/')) return

  //   const { apiInternalUrl } = useRuntimeConfig()
  //   await sendProxy(event, `${apiInternalUrl}${event.path ?? '/'}`)
  // })
})

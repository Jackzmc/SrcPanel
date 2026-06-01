export default defineEventHandler(async (event) => {
  if (!event.path.startsWith('/api')) return

  const config = useRuntimeConfig()
  // console.log(`[api-proxy] ${event.path} -> ${config.apiInternalUrl}${event.path}`)
  return proxyRequest(event, config.apiInternalUrl + event.path, {
    // Do not proxy redirects - the browser should handle these
    fetchOptions: { redirect: 'manual' }
  })
})
export function useApi() {
  const config = useRuntimeConfig()
  const headers = useRequestHeaders(['cookie'])

  const prefix = import.meta.server ? config.apiInternalUrl : config.public.apiPublicUrl
  
  console.log('useApi', `server=${import.meta.server}`, `${prefix}${config.public.apiBase}`)

  return $fetch.create({
    // SSR: direct to fastify with /api prefix
    // Client: relative to nitro proxy at /api
    baseURL: `${prefix}${config.public.apiBase}`,
    credentials: 'include',
    headers
  })
}

import type { $Fetch } from 'ofetch'

export function useApi(): $Fetch {
  const config = useRuntimeConfig()
  const headers = useRequestHeaders(['cookie'])

  return $fetch.create({
    // SSR: direct to fastify with /api prefix
    // Client: relative to nitro proxy at /api
    baseURL: import.meta.server ? `${config.apiInternalUrl}/api` : config.public.apiBase,
    credentials: 'include',
    headers,
  })
}

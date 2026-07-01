export function useApi() {
  const config = useRuntimeConfig();
  const prefix = import.meta.server ? config.apiInternalUrl : config.public.apiPublicUrl;

  return $fetch.create({
    baseURL: `${prefix}${config.public.apiBase}`,
    credentials: "include",
    timeout: import.meta.server ? 4000 : 8000,
    onRequest({ options }) {
      if (import.meta.server) {
        const headers = useRequestHeaders(["cookie"]);
        options.headers = {
          ...options.headers,
          ...headers,
        };
      }
    },
    onResponse({ response }) {
      if (import.meta.server) {
        const setCookie = response.headers.get("set-cookie");
        if (setCookie) {
          const event = useRequestEvent();
          if(event) appendResponseHeader(event, "set-cookie", setCookie);
        }
      }
    }
  });
}

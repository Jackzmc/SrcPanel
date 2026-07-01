import type { PanelMetaInfo } from "@srcpanel/common/Panel";

export async function usePanelMeta() {
  const api = useApi();

  const { data, error } = useAsyncData<PanelMetaInfo>(
    "meta",
    () => api("/meta", { 
      // Reduce timeout on SSR to keep it responsive if server unavailable
      timeout: import.meta.server ? 1000 : 8000
    }),
  );

  return {
    meta: data, // Ref<PanelMetaInfo | null>
    error,
  };
}

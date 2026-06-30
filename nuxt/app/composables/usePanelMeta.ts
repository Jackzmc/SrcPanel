import type { PanelMetaInfo } from "@srcpanel/common/Panel";

export async function usePanelMeta() {
  const api = useApi();

  // Same key = single fetch, shared across all components
  const { data, error } = await useAsyncData<PanelMetaInfo>(
    "meta",
    () => api("/meta", { 
      // Reduce timeout on SSR to keep it responsive if server unavailable
      timeout: import.meta.server ? 1000 : 8000
    }),
  );

  return {
    meta: data, // Ref<PanelMetaInfo | null>
    steamOnline: computed(() => data.value?.steamAvailable ?? true),
    notice: computed(() => data.value?.settings.notice?.enabled ? data.value.settings.notice : null),
    error,
  };
}

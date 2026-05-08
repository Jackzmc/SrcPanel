import type { PanelMetaInfo } from '@jzpanel/common/Panel'

export async function useMeta() {
  const api = useApi()

  // Same key = single fetch, shared across all components
  const { data, error } = await useAsyncData<PanelMetaInfo>(
    'meta',
    () => api('/meta')
  )

  return {
    meta: data,       // Ref<PanelMetaInfo | null>
    steamOnline: computed(() => data.value?.steamAvailable ?? true),
    notice: computed(() => data.value?.settings.notice?.enabled ? data.value.settings.notice : null),
    error,
  }
}

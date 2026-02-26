<template>
  <UModal open
    :title="title"
    :description="description"
    @update:open="$emit('close')"
  >
    <template #body>
      <div>
        <div v-if="props.loading" class="flex items-center gap-2" >
          <UIcon name="i-lucide-loader-circle" class="animate-spin size-6 my-4" />
          <h2 class="text-xl">Fetching workshop item details...</h2>
        </div>
        <div v-else-if="props.addon">
          {{ JSON.stringify(props.addon, null, 2 )}}
        </div>
        <div v-else>
          <h4 class="text-lg font-medium">No Addon Info</h4>
          <p>No addon was found</p>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { AddonInfo, ShareInfo } from '@common/Share';

const route = useRoute()

const props = defineProps<{
  loading: boolean,
  addon: AddonInfo | undefined,
  id: string,
  share: ShareInfo
}>()

const title = computed(() => {
  return props.addon?.workshop?.title ?? props.addon?.filename ?? props.id
})

const description = computed(() => {
  return `${props.share.id} / ${props.id}`
})
</script>

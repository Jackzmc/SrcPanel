<template>
  <UModal
    :close="{ onClick: () => emit('close', false) }"
    :title="title"
    :description="subtitle"
    aria-describedby="Alert Modal"
  >
    <template v-if="body" #body>
      <component :is="body" v-if="isVNode" />
      <span v-else v-html="body" />
    </template>
    <template #footer>
      <div class="flex gap-2">
        <UButton :color="okColor" :label="okText" @click="emit('close', false)" />
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { PromptAlertOptions } from '~/composables/useModal';

const props = withDefaults(defineProps<PromptAlertOptions>(), {
  okText: "Close",
  okColor: "primary",
})

const emit = defineEmits<{ close: [boolean] }>()

const isVNode = computed(() => typeof props.body !== 'string')
</script>

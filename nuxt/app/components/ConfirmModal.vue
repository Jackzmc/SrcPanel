<template>
  <UModal
    :close="{ onClick: () => emit('close', false) }"
    :title="title"
    :description="description"
  >
    <template #footer>
      <div class="flex gap-2">
        <UButton :color="okColor" :label="okText" @click="emit('close', true)" />
        <UButton :color="cancelColor" :label="cancelText" @click="emit('close', false)" />
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { PromptOptions } from '~/composables/useModal';

withDefaults(defineProps<PromptOptions>(), {
  okText: "Okay",
  okColor: "primary",
  cancelText: 'Cancel',
  cancelColor: "neutral"
})

const emit = defineEmits<{ close: [boolean] }>()
</script>

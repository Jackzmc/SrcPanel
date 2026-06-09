<template>
  <UModal
    :close="{ onClick: () => emit('close', false) }"
    :title="title"
    :description="description"
    aria-describedby="Confirmation Modal"
  >
    <template v-if="body" #body>
      <span v-html="body" />
    </template>
    <template #footer>
      <div class="flex gap-2">
        <UButton v-if="okShown" :color="okColor" :label="okText" @click="emit('close', true)" />
        <UButton :color="cancelColor" :label="cancelText" @click="emit('close', false)" />
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { PromptConfirmOptions } from "~/composables/useModal";

withDefaults(defineProps<PromptConfirmOptions>(), {
  okText: "Okay",
  okColor: "primary",
  okShown: true,
  cancelText: "Cancel",
  cancelColor: "neutral",
});

const emit = defineEmits<{ close: [boolean] }>();
</script>

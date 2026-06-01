<template>
  <UModal
    :close="{ onClick: () => emit('close') }"
    :title="title"
    :description="description"
    default-open
    aria-describedby="Input Modal"
  >
    <template #body>
      <UInput :type="type" :minlength="minlength" :maxlength="maxlength" :placeholder="placeholder" size="xl" v-model="value" class="w-full" autofocus tabindex="1" @keydown.enter="emit('close', value)" />
    </template>
    <template #footer>
      <div class="flex gap-2">
        <UButton label="Submit" color="primary" @click="emit('close', value)" tabindex="2" />
        <UButton label="Cancel" color="neutral" variant="outline" @click="emit('close')" tabindex="3" />
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { PromptInputOptions } from '~/composables/useModal';

const props = withDefaults(defineProps<PromptInputOptions>(), {
  type: "text",
  placeholder: "Enter a value",
})

const emit = defineEmits<{
  (e: 'close', value?: string): void,
}>()

const value = ref(props.defaultValue ?? "")
</script>

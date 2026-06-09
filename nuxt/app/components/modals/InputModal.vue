<template>
  <UModal
    :close="{ onClick: () => emit('close') }"
    :title="title"
    :description="description"
    default-open
    aria-describedby="Input Modal"
  >
    <template #body>
      <UInput
v-model="value"
:type="type"
:minlength="minlength"
:maxlength="maxlength"
:placeholder="placeholder"
size="xl"
class="w-full"
autofocus
tabindex="1"
@keydown.enter="emit('close', value)" />
    </template>
    <template #footer>
      <div class="flex gap-2">
        <UButton label="Submit" color="primary" tabindex="2" @click="emit('close', value)" />
        <UButton label="Cancel" color="neutral" variant="outline" tabindex="3" @click="emit('close')" />
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

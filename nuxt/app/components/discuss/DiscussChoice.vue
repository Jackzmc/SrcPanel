<template>
  <a class="cursor-pointer" @click="onClick">
    <UCard class="bg-light-blue">
      <div class="flex justify-between items-start gap-3">
        <div class="flex justify-start items-start gap-2">
          <input
            :type="inputType"
            :checked="selected"
            class="accent-primary-500 mt-2"
          />
          <span class="text-md">
            {{ entry.option.label }}
          </span>
        </div>
        <div v-if="entry.count" class="text-primary text-lg">
          {{ Math.round(entry.count.percent*100) }}%
        </div>
      </div>
    </UCard>
  </a>
</template>

<script setup lang="ts">
import { APIDiscussionType, type APIDiscussionOption } from '@jzpanel/common/Discussions';
import type { DiscussOptionEntry } from '~~/shared/types/discuss';

const emit = defineEmits<{
  (e: "select", optionId: number): void;
}>()

const props = defineProps<{
  entry: DiscussOptionEntry,
  type: APIDiscussionType,
  userSelection: number[],
  editable?: boolean
}>()

const inputType = computed(() => {
  return props.type == APIDiscussionType.Checkbox ? 'checkbox' : 'radio'
})

const selected = computed(() => {
  return props.userSelection.includes(props.entry.option.id)
})

function onClick() {
  emit("select", props.entry.option.id)
}
</script>

<template>
  <a>
    <!-- <UCard>
      {{ option.label }}
    </UCard> -->
    <!-- <UCheckbox :label="option.label" variant="card" /> -->
    <!-- <URadio :label="option.label" variant="card" /> -->
    <UCard>
      <div class="flex justify-between items-start gap-3">
        <div class="flex justify-start gap-2">
          <input
            :type="inputType"
            class="accent-primary-500"
          />
          <span class="text-lg">
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
import { APIDiscussionType, type APIDiscussionOption } from '@common/Discussions';
import type { DiscussOptionEntry } from '~~/shared/types/discuss';

const props = defineProps<{
  entry: DiscussOptionEntry,
  type: APIDiscussionType
}>()

const inputType = computed(() => {
  return props.type == APIDiscussionType.Checkbox ? 'checkbox' : 'radio'
})
</script>

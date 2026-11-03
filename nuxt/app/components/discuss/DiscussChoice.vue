<template>
  <a class="cursor-pointer" @click="onClick">
    <UCard class="bg-light-blue">
      <div class="flex justify-between items-start gap-3">
        <div class="flex justify-start items-start gap-2">
          <input
            :type="inputType"
            :checked="selected"
            class="accent-primary-500 mt-2"
          >
          <span class="text-md">
            {{ entry.label }}
          </span>
        </div>
        <div v-if="'percent' in entry" class="text-primary text-lg">
          {{ Math.round(entry.percent*100) }}%
        </div>
      </div>
    </UCard>
  </a>
</template>

<script setup lang="ts">
import { APIDiscussionType, type APIDiscussionOption, type APIDiscussionOptionWithCount } from "@srcpanel/common/Discussions";

const emit = defineEmits<{
  (e: "select", optionId: number): void;
}>();

const props = defineProps<{
  entry: APIDiscussionOption | APIDiscussionOptionWithCount;
  type: APIDiscussionType;
  userSelection: number[];
  editable?: boolean;
}>();

const inputType = computed(() => {
  return props.type == APIDiscussionType.Checkbox ? "checkbox" : "radio";
});

const selected = computed(() => {
  return props.userSelection.includes(props.entry.id);
});

function onClick() {
  emit("select", props.entry.id);
}
</script>

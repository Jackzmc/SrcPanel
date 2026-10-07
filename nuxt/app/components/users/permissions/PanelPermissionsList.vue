<template>
  <div>
    <div :class="edit ? 'flex flex-col' : 'flex justify-justify-around flex-wrap gap-1 my-2 mx-4'">
    <div v-for="code in sortedCodes" 
      :key="code" 
      :class="['px-2 py-2 h-max my-0 gap-y-0! bg-gray-100 dark:bg-gray-600', { 'text-center': !edit }]"
    >
      {{ code }}
      <Icon v-if="edit" name="lucide:trash" class="float-right" />
    </div>
    <UInput v-if="edit" class="py-2" type="text" placeholder="Enter permission code" leading-icon="lucide:plus" />
  </div>
  </div>
</template>

<script setup lang="ts">
import type { UserPrivilegeCode } from "@srcpanel/common/Privileges";

const emit = defineEmits<{
  (e: "remove", code: UserPrivilegeCode): void;
  (e: "add", code: UserPrivilegeCode): void;
}>();

const props = defineProps<{
  edit?: boolean;
  codes?: string[];
}>();

const sortedCodes = computed(() => {
  return (props.codes ?? [])
    .sort((a, b) => a.length - b.length)
})
</script>

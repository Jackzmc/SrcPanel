<template>
  <div :class="edit ? 'flex flex-col' : 'flex justify-justify-around flex-wrap gap-3 my-2 mx-4'">
    <div v-for="code in (codes || []).sort((a,b) => a.length - b.length)" :key="code">
      <div :class="['px-2 py-2 bg-gray-100 dark:bg-gray-600', {'text-center': !edit}]">
        {{ code }}
        <Icon v-if="edit" name="lucide:trash" class="float-right" />
      </div>
    </div>
    <UInput v-if="edit" class="py-2" type="text" placeholder="Enter permission code" leading-icon="lucide:plus" />
  </div>
</template>

<script setup lang="ts">
import type { UserPrivilegeCode } from '@jzpanel/common/Privileges';

const emit = defineEmits<{
  (e: 'remove', code: UserPrivilegeCode): void,
  (e: 'add', code: UserPrivilegeCode): void,
}>()

defineProps<{
  edit?: boolean,
  codes?: string[]
}>()
</script>

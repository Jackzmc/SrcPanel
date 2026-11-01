<template>
  <div>
    <div :class="edit ? 'flex flex-col' : 'flex justify-justify-around flex-wrap gap-1 my-2 mx-4'">
    <div v-for="code in sortedCodes" 
      :key="code" 
      :class="['px-2 py-2 h-max my-0 gap-y-0! bg-gray-100 dark:bg-gray-600', { 'text-center': !edit }]"
    >
      {{ code }}
      <UButton v-if="edit" class="float-right"
        leading-icon="lucide:trash"
        size="sm"
        color="error"
        variant="outline" 
        @click="deleteCode(code)" />
      <!-- <Icon v-if="edit" name="lucide:trash" class="float-right" /> -->
    </div>
    <UFormField :error="inputError">
      <UInput v-if="edit" class="py-2" type="text" placeholder="Enter permission code" leading-icon="lucide:plus" 
        @keydown.enter="addCode"
        @input="inputError = undefined"
      />
    </UFormField>

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
}>();

const codes = defineModel<string[]>({ required: true })

const inputError = ref<string|undefined>()

const sortedCodes = computed(() => {
  return (codes.value ?? [])
    .sort((a, b) => a.length - b.length)
})

function addCode(event: KeyboardEvent) {
  inputError.value = undefined
  const target = event.target as HTMLInputElement
  if(!codes.value.includes(target.value)) {
    codes.value.push(target.value)
    target.value = ""
  } else {
    inputError.value = "Code already exists"
  }
}

function deleteCode(code: string) {
  const index = codes.value.indexOf(code)
  if(index != -1)
    codes.value.splice(index, 1)
}
</script>

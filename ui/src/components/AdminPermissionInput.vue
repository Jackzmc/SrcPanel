<template>
  <Field label="Web Permissions">
    <div class="tags">
      <span v-for="tag in value" :key="tag" class="tag is-info">
        {{ tag }}
      </span>
    </div>
    <p v-if="value.length === 0" class="pb-4">
      <em>No permissions granted</em>
    </p>
    <Field :error="formError">
      <input placeholder="Add new web permission" list="codes" type="text" :class="['input', {'is-danger': isNewCodeValid === false, 'is-success': isNewCodeValid === true}]" v-model="newCode" @keydown.enter="addCode">
      <datalist id="codes">
        <option v-for="code in UserPrivilegeCodes" :key="code">
          {{ code }}
        </option>
      </datalist>
    </Field>
  </Field>
  <!-- <Vue3TagsInput :tags="['test']" :loading="loading" :validate="validatePerm" select :select-items="choices" placeholder="Add permissions">
    <template #item="{tag}">
      {{ tag }}
    </template>
    <template #select-item="tag">
      {{ tag.text }}
    </template>
  </Vue3TagsInput> -->
</template>

<script setup lang="ts">
import { UserPrivilegeCodes } from '../../../common-types/Privileges'
import Field from '@/components/Field.vue'
//@ts-expect-error
import Vue3TagsInput from 'vue3-tags-input'
import { ref, computed } from 'vue'

const VALID_CODE_REGEX = new RegExp(/^([a-z_0-9]+)(\.([a-z_\*0-9]+))+$/)

const props = defineProps<{
  modelValue: string[],
}>()
const emit = defineEmits(['update:modelValue'])
const value = computed({
  get() {
    return props.modelValue
  },
  set(value) {
    emit('update:modelValue', value)
  }
})
const isNewCodeValid = computed(() => {
  if(!newCode.value) return
  return VALID_CODE_REGEX.test(newCode.value)
})
const formError = computed(() => {
  if(isNewCodeValid.value === false)
    return "Not a valid permission code"
  return undefined
})

let newCode = ref<string>()
function addCode() {
  if(isNewCodeValid.value) {
    value.value.push(newCode.value!)
    newCode.value = undefined
  }
}

</script>

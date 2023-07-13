<template>
  <input ref="element" class="input" v-model="value" type="text" data-type="tags" placeholder="Choose Tags">
  <!-- <select multiple v-model="value" ref="element" data-type="tags" :disabled="disabled" :data-placeholder="placeholder">
    <template v-if="Array.isArray(choices)">
      <option v-for="(choice) in choices" :key="choice">{{ choice }}</option>
    </template>
    <template v-else>
      <option v-for="(display, id) in choices" :key="id">{{ display }}</option>
    </template>
  </select> -->
</template>

<script setup lang="ts">
import BulmaTagsInput from '@creativebulma/bulma-tagsinput'
import { onMounted, ref, computed } from 'vue'
const props = defineProps<{
  modelValue: string[]
  placeholder?: string,
  choices: Record<string, string> | string[],
  disabled?: boolean,
  freeInput?: boolean
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
let element = ref()

onMounted(() => {
  new BulmaTagsInput(element.value, {
    freeInput: true
  })
})
</script>

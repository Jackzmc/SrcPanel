<template>
<input type="text" class="input" v-model="edit" v-if="edit" @blur="update" ref="input" />
<span v-else @click="startEdit">{{ modelValue }}</span>
</template>

<script setup lang="ts">
import { emitKeypressEvents } from 'readline';
import { ref, nextTick } from 'vue';

const emit = defineEmits(['update:modelValue'])

const props = defineProps<{
  modelValue: string
}>()

let input = ref()
let edit = ref()

function startEdit() {
  edit.value = props.modelValue
  nextTick(() => {
    input.value.focus()
  })
}

function update() {
  emit('update:modelValue', edit.value)
  edit.value = undefined
}
</script>

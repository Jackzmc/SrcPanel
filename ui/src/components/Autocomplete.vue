<template>
<div class="dropdown is-active">
  <div class="dropdown-trigger">
    <slot>
      <input v-model="textInput" :class="inputClass" type="text" :placeholder="placeholder" @input="onInputDebounce">
    </slot>
  </div>
  <div v-if="filteredItems.length > 0" class="dropdown-menu" role="menu">
    <div class="dropdown-content">
      <a v-for="item of filteredItems" :key="item.id" href="#" class="dropdown-item" @click="select(item)">
        <slot name="item" :item="item">
          {{ item.label }}
        </slot>
      </a>
    </div>
  </div>
</div>
</template>

<script setup lang="ts">
import { ref, computed, InputHTMLAttributes } from 'vue';
import debounce from '@/js/debounce.js'
const props = withDefaults(defineProps<{
  modelValue: any,
  inputClass?: string,
  placeholder?: string
  minLength?: number
  items: {id: string, label: string}[]
}>(), { minLength: 2 })
const emit = defineEmits(['update:modelValue'])
let textInput = ref<string>()
let filteredItems = ref<{id: string, label: string}[]>([])
function onInput() {
  if(!textInput.value) return
  const input = textInput.value.toLocaleLowerCase().trim()
  if(input.length < props.minLength) return
  filteredItems.value = props.items
    .filter(item => item.label.toLowerCase().includes(input))
    .slice(0, 25)
}
const onInputDebounce = debounce(onInput, 200)

function select(item: {id: string, label: string}) {
  emit('update:modelValue', item.id)
  filteredItems.value = []
  textInput.value = item.label
}
</script>

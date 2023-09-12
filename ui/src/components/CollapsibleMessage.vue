<template>
  <article :class="['message',color]">
    <div class="message-header">
      <p>{{ title }}</p>
      <button :class="collapseClass" aria-label="collapse" @click="toggle">
        <Icon :icon="icon" />
      </button>
    </div>
    <div :class="computedBodyClass" v-show="showDetails">
      <slot></slot>
    </div>
  </article>
</template>

<script setup lang="ts">
import { ref, computed, defineEmits } from 'vue'
const emit = defineEmits(["open", "close", "toggle"])

const props = defineProps<{
  title?: string,
  color?: "is-dark" | "is-primary" | "is-danger" | "is-warning" | "is-link" | "is-secondary" | "is-white" | "is-black",
  bodyClass?: string
}>()

let showDetails = ref(false)
const icon = computed(() => {
  return showDetails.value ? "chevron-up" : "chevron-down"
})
const collapseClass = computed(() => {
  if(props.color === "is-dark" || props.color === "is-black") return "has-background-dark has-text-white"
  return ""
})
const computedBodyClass = computed(() => {
  return props.bodyClass ?? "message-body"
})

function toggle() {
  showDetails.value = !showDetails.value
  if(showDetails.value) {
    emit('open')
  } else {
    emit('close')
  }
  emit('toggle', showDetails.value)
}
</script>

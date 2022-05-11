<template>
  <div :class="['modal',{'is-active': active}]">
    <div class="modal-background"></div>
    <slot></slot>
    <button v-if="closable" class="modal-close is-large" aria-label="close"></button>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  active: boolean,
  closable: boolean
}>()
</script>

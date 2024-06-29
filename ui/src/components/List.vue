<template>
  <div :class="['list', {'has-visible-pointer-controls': controlsVisible,  'has-hoverable-list-items': hoverable, 'has-overflow-ellipsis': overflowEllipsis, 'has-hidden-images': hiddenImages}]">
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  hoverable?: boolean,
  overflowEllipsis?: boolean,
  controlsVisible?: boolean,
  hiddenImages?: boolean
}>()
</script>

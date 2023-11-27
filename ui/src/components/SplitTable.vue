<template>
    <template v-for="split in splitData">
      <slot :data="split"></slot>
    </template>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  itemsPerColumn: number,
  data: any[]
}>()

const columnCount = computed(() => {
  return Math.ceil(props.data.length / props.itemsPerColumn)
})

const splitData = computed(() => {
  const a = []
  for(let column = 0; column < columnCount.value; column++) {
    console.log('slice', `[${column * props.itemsPerColumn}, ${((column + 1) * props.itemsPerColumn)}]`)
    a.push(props.data.slice(column * props.itemsPerColumn, (column + 1) * props.itemsPerColumn))
  }
  return a
})
</script>

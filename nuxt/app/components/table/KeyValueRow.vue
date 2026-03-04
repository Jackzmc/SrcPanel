<template>
<tr class="border-neutral-300 border-1">
  <th class="text-left border-r-neutral-300 border-r-1 p-2 bg-white text-black dark:bg-blue-950 dark:text-white">{{ label }}</th>
  <td :class="['bg-neutral-50 dark:bg-neutral-800 px-2 py-1', valueClass]">
    <slot />
  </td>
</tr>
</template>

<script setup lang="ts">
defineProps<{
  label: string,
  valueClass?: string
}>()
</script>

<template>
  <UBadge
    :color="required ? 'info' : 'neutral'"
    :variant="required ? 'solid' : 'outline'"
  >
    <slot />
  </UBadge>
</template>

<script setup lang="ts">
defineProps<{
  required?: boolean
}>()
</script>

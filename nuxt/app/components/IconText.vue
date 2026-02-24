<template>
  <UTooltip :text="tooltip">
    <div>
      <UIcon :name="icon" class="icon-text" />
      <slot>{{ text }}</slot>
    </div>
  </UTooltip>
</template>

<script setup lang="ts">
defineProps<{
  icon: string,
  text?: string,
  tooltip?: string
}>()
</script>

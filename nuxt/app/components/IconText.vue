<template>
  <UTooltip :text="tooltip">
    <div>
      <UIcon v-if="leadingIcon" :name="leadingIcon" class="icon-text" />
      <slot>{{ text }}</slot>
      <UIcon v-if="trailingIcon" :name="trailingIcon" class="icon-text ml-1" />
    </div>
  </UTooltip>
</template>

<script setup lang="ts">
defineProps<{
  leadingIcon?: string,
  trailingIcon?: string,
  text?: string,
  tooltip?: string
}>()
</script>

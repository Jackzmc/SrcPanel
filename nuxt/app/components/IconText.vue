<template>
  <UTooltip :text="tooltip">
    <div>
      <UIcon v-if="leadingIcon" :name="leadingIcon" class="icon-text" />
      <span class="mx-1">
        <slot>{{ text }}</slot>
      </span>
      <UIcon v-if="trailingIcon" :name="trailingIcon" class="icon-text" />
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

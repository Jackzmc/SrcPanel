<template>
  <UTooltip :text="tooltip">
    <div>
      <UIcon v-if="leadingIcon" :name="leadingIcon" :class="['icon-text', leadingIconClass]" />
      <span class="mx-1">
        <slot>{{ text }}</slot>
      </span>
      <UIcon v-if="trailingIcon" :name="trailingIcon" :class="['icon-text', trailingIconClass]" />
    </div>
  </UTooltip>
</template>

<script setup lang="ts">
defineProps<{
  leadingIcon?: string;
  leadingIconClass?: string;
  trailingIcon?: string;
  trailingIconClass?: string;
  text?: string;
  tooltip?: string;
}>();
</script>

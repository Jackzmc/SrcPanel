<template>
  <span :class="button ? undefined : 'icon-text'">
    <span :class="'icon ' + (iconClass ?? '')">
      <FontAwesomeIcon :icon="icon" :spin="spin" :rotation="rotate" :size="size" />
    </span>
    <span v-if="$slots.default || text">
      <slot>{{ text }}</slot>
    </span>
  </span>
</template>

<script setup lang="ts">
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
const props = defineProps<{
  icon: string,
  text?: string,
  iconClass?: string,
  spin?: boolean,
  button?: boolean,
  rotate?: 90 | 180 | 270 | "90" | "180" | "270" | undefined,
  size?: "2xs" | "xs" | "sm" | "lg" | "xl" | "2xl" | "1x" | "2x" | "3x" | "4x" | "5x" | "6x" | "7x" | "8x" | "9x" | "10x" | undefined
}>()
</script>

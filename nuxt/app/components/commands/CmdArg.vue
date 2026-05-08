<template>
  <UTooltip
    :text="tooltipText"
    :content="{
      align: 'start',
      side: 'top',
      sideOffset: 8
    }"
    :ui="{
      content: 'tooltip-dark'
    }"
  >
    <UBadge
      :color="required ? 'info' : 'neutral'"
      :variant="required ? 'solid' : 'outline'"
      :leading-icon="type && iconMap[type]"
    >
      <slot>{{ arg }}</slot>
    </UBadge>
  </UTooltip>
</template>

<script setup lang="ts">
import type { ParamType } from '@jzpanel/common/methods/cmds/util';

const iconMap: Record<ParamType, string|undefined> = {
  text: 'i-lucide-type',
  integer: 'i-lucide-hash',
  decimal: 'i-lucide-hash',
  boolean: 'i-lucide-check',
  player: 'i-lucide-user',
  players: 'i-lucide-users',
  any: 'i-lucide-asterik'
}

const props = defineProps<{
  required?: boolean,
  arg?: string,
  allowedValues?: string[],
  type?: ParamType
}>()

const tooltipText = computed(() => {
  const lines = []
  if(props.type) {
    lines.push(`type ${props.type}`)
  }
  return lines.join("\n")
})
</script>

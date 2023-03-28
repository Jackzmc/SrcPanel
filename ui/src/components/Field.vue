<template>
<div class="field">
    <label class="label" v-if="label || slots.label"><slot name="label">{{ label }}</slot></label>
    <div :class="['control', {'has-icons-left': iconLeft, 'has-icons-right': iconRight}]">
      <slot />
      <span class="icon is-small is-left" v-if="iconLeft">
        <FontAwesomeIcon :icon="iconLeft" />
      </span>
      <span class="icon is-small is-right" v-if="iconRight">
        <FontAwesomeIcon :icon="iconRight" />
      </span>
    </div>
    <p class="help is-success" v-if="success || slots.hint_success"><slot name="hint_success">{{ success }}</slot></p>
    <p class="help is-danger" v-if="error || slots.hint_error"><slot name="hint_error">{{ error }}</slot></p>
    <p class="help is-info" v-if="info || slots.hint_info"><slot name="hint_info">{{ info }}</slot></p>
</div>
</template>

<script setup lang="ts">
import { useSlots } from 'vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
const slots = useSlots()
const props = defineProps<{
  label?: string,
  success?: string,
  error?: string,
  info?: string,
  iconLeft?: string,
  iconRight?: string
}>()
</script>

<template>
  <UInput v-if="inEditState" @blur="toggle()" @keyup.enter="toggle()" v-model="model" autofocus class="w-80" :placeholder="inputPlaceholder" />
  <UTooltip v-else-if="model" text="Click text to start editing" @click="toggle()"><span>{{ model }}</span></UTooltip>
  <UTooltip v-else text="Click text to start editing" @click="toggle()" class="text-muted"><em>{{ placeholder }}</em></UTooltip>
</template>

<script setup lang="ts">

const model = defineModel<string>()

const props = defineProps<{
  inputPlaceholder?: string,
  placeholder?: string
}>()

const inEditState = ref(false)

const toggle = () => {
  inEditState.value = !inEditState.value
}
</script>

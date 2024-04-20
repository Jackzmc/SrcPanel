<template>
  <ModalCard :title="title ?? 'Confirmation'" @close="cancel">
    <slot></slot>
    <template #buttons>
      <button class="button is-success" @click="confirm">Confirm</button>
      <button class="button" @click="cancel">Cancel</button>
    </template>
  </ModalCard>
</template>

<script setup lang="ts">
import ModalCard from './ModalCard.vue';
const emit = defineEmits(["cancel", "confirm"])
const props = defineProps<{
  title?: string,
}>()

function confirm() {
  emit('confirm')
}

function cancel() {
  emit('cancel')
}
</script>

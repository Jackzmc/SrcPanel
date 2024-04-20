<template>
<div class="modal is-active">
  <div class="modal-background"></div>
  <div class="modal-card">
    <header class="modal-card-head">
      <slot name="header">
        <p class="modal-card-title"><slot name="title">{{ title }}</slot></p>
        <button class="delete" aria-label="close" @click="emit('close')"></button>
      </slot>
    </header>
    <section class="modal-card-body">
      <slot></slot>
    </section>
    <footer class="modal-card-foot" style="display: block">
      <slot name="footer">
      <div class="buttons">
        <slot name="buttons">
          <button class="button is-success"  @click="emit('save')">Save changes</button>
          <button class="button"  @click="emit('close')">Cancel</button>
        </slot>
      </div>
    </slot>
    </footer>
  </div>
</div>
</template>

<script setup lang="ts">
const emit = defineEmits(["save", "close"])
const props = defineProps<{
  title?: string
}>()
</script>

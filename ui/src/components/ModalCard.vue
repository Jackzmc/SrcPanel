<template>
<div class="modal is-active">
  <div class="modal-background"></div>
  <div class="modal-card">
    <header class="modal-card-head">
      <slot name="head">
        <p class="modal-card-title">{{ title }}</p>
        <button class="delete" aria-label="close"></button>
      </slot>
    </header>
    <section class="modal-card-body">
      <slot></slot>
    </section>
    <footer class="modal-card-foot">
      <slot name="footer">
      <div class="buttons">
        <slot name="buttons">
          <button class="button is-success">Save changes</button>
          <button class="button">Cancel</button>
        </slot>
      </div>
    </slot>
    </footer>
  </div>
</div>
</template>

<script setup lang="ts">
const props = defineProps<{
  title?: string
}>()
</script>

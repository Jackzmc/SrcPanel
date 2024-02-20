<template>
<div :class="['list-item', {'box': props.box}]">
  <div class="list-item-image">
    <slot name="image">
      <figure class="image is-64x64">
        <img class="is-rounded" :src="props.imageSrc">
      </figure>
    </slot>
  </div>

  <div class="list-item-content">
    <slot name="content">
      <div class="list-item-title">
        <slot name="title"></slot>
      </div>
      <div class="list-item-description">
        <slot name="description"></slot>
      </div>
    </slot>
  </div>

  <div class="list-item-controls">
    <slot name="controls"></slot>
  </div>
</div>
</template>

<script setup lang="ts">
const props = defineProps<{
  box?: boolean,
  imageSrc?: string
}>()
</script>

<template>
  <!-- eslint-disable vue/no-v-html -- pulled from route meta (router/index.js) -->
  <Icon v-if="route.meta?.icon" :icon="route.meta.icon" class="no-border has-tooltip-right" :data-tooltip="route.meta?.description">
    {{ labelText }}
    <span v-if="route.meta?.nav?.tagHtml" v-html="route.meta?.nav?.tagHtml" />
  </Icon>
  <span v-else class="no-border has-tooltip-right" :data-tooltip="route.meta?.description">
    {{ labelText }}
    <span v-if="route.meta?.nav?.tagHtml" v-html="route.meta?.nav?.tagHtml" />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { RouteRecordRaw } from 'vue-router';

const props = defineProps<{
  route: RouteRecordRaw
}>()

const labelText = computed(() => {
  return props.route?.meta?.nav?.labelText ?? props.route.meta?.title ?? props.route.name
})
</script>

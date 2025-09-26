<template>
  <Icon v-if="route.meta?.nav?.icon" :icon="route.meta.nav.icon">
    {{ labelText}}
    <span v-if="route.meta?.nav?.tagHtml" v-html="route.meta?.nav?.tagHtml" />
  </Icon>
  <span v-else>
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

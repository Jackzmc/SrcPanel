<template>
  <UCard>
    {{ map.filename }}
  </UCard>
</template>

<script setup lang="ts">
import type { AddonInfo } from '@common/Share';

defineProps<{
  map: AddonInfo;
}>();
</script>

<style scoped>
</style>

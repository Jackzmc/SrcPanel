<template>
  <div class="bg-primary mb-6 text-center py-6 text-white">
    <h2 class="text-3xl font-semibold">
      {{ title }}
    </h2>
    <p class="text-lg text-gray-100">
      {{ subtitle }}
    </p>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
}>()
</script>

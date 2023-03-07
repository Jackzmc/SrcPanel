<template>
<div class="container has-text-centered mb-5">
  <br><br><br>
  <h1 class="title is-1 has-text-danger">{{ route.query.error }}</h1>
  <p class="subtitle is-4">An error occurred while authenticating with the server</p>
  <p class="subtitle is-4">The server may be down or unreachable, try again in a few minutes.</p>
  <br>
  <a :href="returnTo" class="button is-medium is-info">Retry</a>
</div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router';
const route = useRoute()

const returnTo = computed(() => {
  return route.query.return as string
})
</script>

<template>
<div class="container has-text-centered mb-5">
  <br><br>
  <template v-if="route.meta.status === 404">
    <p class="subtitle is-4">No page was found matching <b>{{ route.path }}</b></p>
    <p class="subtitle is-4"><a @click="router.back()" v-if="hasHistory">Go back to previous page</a></p>
    <router-link to="/" class="button is-medium is-info  has-text-centered">To Homepage</router-link>
  </template>
  <template v-else>
    <br>
    <h1 class="title is-1 has-text-danger">{{ route.query.error ?? "Internal Server Error" }}</h1>
    <p class="subtitle is-4">An error occurred while authenticating with the server</p>
    <p class="subtitle is-4">The server may be down or unreachable, try again in a few minutes.</p>
    <br>
    <router-link :to="returnTo" class="button is-medium is-info">Retry</router-link>
  </template>
</div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router';
const route = useRoute()
const router = useRouter()

const hasHistory = computed(() => window.history.length > 0)

const returnTo = computed(() => {
  return route.query.return as string
})

</script>

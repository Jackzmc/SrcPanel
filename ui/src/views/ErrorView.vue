<template>
<div class="container has-text-centered mb-5">
  <br><br>
  <template v-if="route.meta.status === 404">
    <p class="subtitle is-4">No page was found matching <b>{{ route.path }}</b></p>
    <p class="subtitle is-4"><a @click="router.back()" v-if="hasHistory">Go back to previous page</a></p>
    <router-link to="/" class="button is-medium is-info  has-text-centered">To Homepage</router-link>
  </template>
  <template v-else-if="errorType === 'oauth_no_account'">
    <h4 class="title is-4">No account found</h4>
    <p class="subtitle is-4">No account was found linked to your {{ route.query.provider }} account.</p>
    <div class="container content box has-text-left" style="width:30%">
      <p>You must link your {{ route.query.provider }} account to your steam account to be able to login with {{ route.query.provider }}. You can do this by:</p>
      <ul>
        <li>Press <b>[Login With Steam]</b> on the top right</li>
        <li>Hover over your name on the top right</li>
        <li>Press the <b>User Settings</b> option</li>
        <li>Switch to the <b>Connections</b> tab</li>
        <li>Press the <b>[Link]</b> button for {{ route.query.provider }}</li>
      </ul>
    </div>
    <hr>
    <p class="subtitle is-4"><a @click="router.back()" v-if="hasHistory">Go back to previous page</a></p>
    <router-link to="/" class="button is-medium is-info  has-text-centered">To Homepage</router-link>
  </template>
  <template v-else-if="errorType === 'oauth_error'">
    <br>
    <h4 class="title is-4 has-text-danger">Login Error</h4>
    <p class="subtitle is-4 mb-0">Could not link or login to {{ route.query.provider }} due to an error.</p>
    <p class="subtitle is-4">Try again or please report the issue if it persists.</p>
    <p><em>Error code: {{ route.query.oauth_error ?? ('(none)') }}</em></p>
    <br>
    <router-link :to="returnTo ?? '/'" class="button is-medium is-info">Home</router-link>
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
import { computed, onBeforeMount } from 'vue'
import { useRoute, useRouter } from 'vue-router';
const route = useRoute()
const router = useRouter()

const hasHistory = computed(() => window.history.length > 0)


const returnTo = computed(() => {
  return route.query.return as string
})
const errorType = computed(() => {
  return route.query.type as string
})

async function testServer() {
  const response = await fetch("/api/auth/profile")
  if(response.ok) {
    router.push(returnTo.value)
  }
}

onBeforeMount(() => {
  testServer()
})

</script>

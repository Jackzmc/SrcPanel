<template>
  <a type="submit" class="button has-text-white is-dark"  style="background-color:#5865F2" :href="loginUri">
    <Icon icon="fab fa-discord" >Login with Discord</Icon>
  </a>
</template>

<script setup lang="ts">
import { inject, computed} from 'vue'
import { useRoute } from 'vue-router'
const route = useRoute()

const redirectUri = computed(() => {
  return `${import.meta.env.VITE_API_URL}/auth/discord/callback?return_uri=${route.fullPath}`
})
const loginUri = computed(() => {
  return `${import.meta.env.VITE_API_URL}/auth/discord/login?return_uri=${route.fullPath}`
})
const realm = computed(() => {
  return import.meta.env.VITE_REALM
})
</script>

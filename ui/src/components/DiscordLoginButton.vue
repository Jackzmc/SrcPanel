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
  return `${process.env.VUE_APP_API_URL}/auth/discord/callback?return_uri=${route.fullPath}`
})
const loginUri = computed(() => {
  return `${process.env.VUE_APP_API_URL}/auth/discord/login?return_uri=${route.fullPath}`
})
const realm = computed(() => {
  return process.env.VUE_APP_REALM
})
</script>

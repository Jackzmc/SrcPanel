<template>
  <form method="post" action="https://steamcommunity.com/openid/login">
    <input type="hidden" name="openid.realm" :value="REALM" />
    <input type="hidden" name="openid.return_to" :value="redirectUri" />
    <input type="hidden" name="openid.mode" value="checkid_setup" />
    <input type="hidden" name="openid.identity" value="http://specs.openid.net/auth/2.0/identifier_select">
    <input type="hidden" name="openid.claimed_id" value="http://specs.openid.net/auth/2.0/identifier_select">
    <input type="hidden" name="openid.ns" value="http://specs.openid.net/auth/2.0">

    <button type="submit" class="button is-dark is-small">Login with Steam</button>
  </form>
</template>

<script setup lang="ts">
import { inject, computed} from 'vue'
import { useRoute } from 'vue-router'
const REALM = inject('REALM')
const API_URL = inject('API_URL')
const route = useRoute()

const redirectUri = computed(() => {
  return `${API_URL}/auth/steam/callback?return_uri=${route.fullPath}`
})
</script>

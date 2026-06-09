<template>
  <form method="post" action="https://steamcommunity.com/openid/login">
    <input type="hidden" name="openid.realm" :value="apiOrigin" >
    <input type="hidden" name="openid.return_to" :value="redirectUri" >
    <input type="hidden" name="openid.mode" value="checkid_setup" >
    <input type="hidden" name="openid.identity" value="http://specs.openid.net/auth/2.0/identifier_select">
    <input type="hidden" name="openid.claimed_id" value="http://specs.openid.net/auth/2.0/identifier_select">
    <input type="hidden" name="openid.ns" value="http://specs.openid.net/auth/2.0">

    <UButton
      type="submit"
      class="bg-black text-white py-3"
      leading-icon="i-simple-icons-steam"
    >
      Login with Steam
    </UButton>
  </form>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const url = useRequestURL()
const config = useRuntimeConfig()

const uiOrigin = `${url.protocol}//${url.host}`
// In dev, apiPublicUrl points to Fastify directly so it sets the cookie itself.
// In prod, it's empty and falls back to same origin (nginx handles /api proxy).
const apiOrigin = config.public.apiAuthUrl || config.public.apiPublicUrl || uiOrigin

const redirectUri = computed(() => {
  let path = url.pathname
  if(path === "/login") path = "/"
  return `${apiOrigin}/api/auth/steam/callback?return_uri=${uiOrigin}/auth/return${encodeURIComponent(`?return_to=${uiOrigin}${path}`)}`
})
</script>

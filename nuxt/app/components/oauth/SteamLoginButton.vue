<template>
  <form method="post" action="https://steamcommunity.com/openid/login">
    <input type="hidden" name="openid.realm" :value="realm" />
    <input type="hidden" name="openid.return_to" :value="redirectUri" />
    <input type="hidden" name="openid.mode" value="checkid_setup" />
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

const realm = computed(() => `${url.protocol}//${url.host}`)

const redirectUri = computed(() => {
  return `${realm.value}/api/auth/steam/callback?return_uri=${realm.value}${url.pathname}`
})
</script>

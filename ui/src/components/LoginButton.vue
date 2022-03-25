<template>
  <form method="post" action="https://steamcommunity.com/openid/login">
    <input type="hidden" name="openid.realm" :value="realm" />
    <input type="hidden" name="openid.return_to" :value="redirectUri" />
    <input type="hidden" name="openid.mode" value="checkid_setup" />
    <input type="hidden" name="openid.identity" value="http://specs.openid.net/auth/2.0/identifier_select">
    <input type="hidden" name="openid.claimed_id" value="http://specs.openid.net/auth/2.0/identifier_select">
    <input type="hidden" name="openid.ns" value="http://specs.openid.net/auth/2.0">

    <button type="submit" class="button is-dark is-small">Login with Steam</button>
  </form>
</template>

<script>
export default {
  computed: {
    realm() {
      return this.$REALM
    },
    redirectUri() {
      return `${this.$API_URL}/auth/steam/callback?return_uri=${this.$route.fullPath}`
    },
  }
}
</script>

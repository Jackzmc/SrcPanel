<template>
  <form method="post" action="https://steamcommunity.com/openid/login">
    <input type="hidden" name="openid.realm" :value="realm" />
    <input type="hidden" name="openid.return_to" :value="redirectUri" />
    <input type="hidden" name="openid.mode" value="checkid_setup" />
    <input type="hidden" name="openid.identity" value="http://specs.openid.net/auth/2.0/identifier_select">
    <input type="hidden" name="openid.claimed_id" value="http://specs.openid.net/auth/2.0/identifier_select">
    <input type="hidden" name="openid.ns" value="http://specs.openid.net/auth/2.0">

    <button type="submit" :class="['button','is-dark',{'is-large': size === 'large', 'is-medium': size === 'medium', 'is-small': size === 'small'}]">
      <Icon icon="fab fa-steam">Login with Steam</Icon>
    </button>
  </form>
</template>

<script setup lang="ts">
import { inject, computed} from 'vue'
import { useRoute } from 'vue-router'
import { PanelMetaInfo } from '../../../../common-types/Panel.js';
const route = useRoute()

const props = defineProps<{
  size?: "small" | "medium" | "large",
  meta: PanelMetaInfo
}>()

const redirectUri = computed(() => {
  return `${props.meta.settings.domain}/api/auth/steam/callback?return_uri=${route.fullPath}`
})
const realm = computed(() => {
  return props.meta.settings.domain
})
</script>

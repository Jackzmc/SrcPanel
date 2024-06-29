<template>
  <a type="submit" :class="['button','has-text-white','is-dark',{'is-large': size === 'large', 'is-medium': size === 'medium', 'is-small': size === 'small'}]"  style="background-color:#5865F2" :href="loginUri">
    <Icon icon="fab fa-discord">Login with Discord</Icon>
  </a>
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
const loginUri = computed(() => {
  return `${props.meta.settings.domain}/api/auth/discord/login?return_uri=${route.fullPath}`
})
</script>

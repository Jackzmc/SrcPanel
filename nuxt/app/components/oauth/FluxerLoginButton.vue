<template>
  <a v-if="props.meta" type="submit" :class="['button','has-text-white','is-outlined','is-link',{'is-large': size === 'large', 'is-medium': size === 'medium', 'is-small': size === 'small'}]" style="background-color: #4641D9;" :href="loginUri">
    <img src="/img/providers/fluxer-white.svg" class="pr-2" />Login with Fluxer
  </a>
</template>

<script setup lang="ts">
import { inject, computed} from 'vue'
import { useRoute } from 'vue-router'
import type { PanelMetaInfo } from '../../../../common-types/Panel.js';
const route = useRoute()

const props = defineProps<{
  size?: "small" | "medium" | "large",
  meta: PanelMetaInfo
}>()
const loginUri = computed(() => {
  if(!props.meta) return
  return `${props.meta.settings.domain ?? `${window.location.protocol}//${window.location.host}`}/api/auth/fluxer/login?return_uri=${route.fullPath}`
})
</script>

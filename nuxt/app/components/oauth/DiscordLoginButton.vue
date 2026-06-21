<template>
  <a v-if="props.meta" type="submit" :class="['button', 'has-text-white', 'is-dark', { 'is-large': size === 'large', 'is-medium': size === 'medium', 'is-small': size === 'small' }]" style="background-color:#5865F2" :href="loginUri">
    <IconText leading-icon="fab fa-discord">Login with Discord</IconText>
  </a>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import type { PanelMetaInfo } from "@jzpanel/common/Panel";

const route = useRoute();

const props = defineProps<{
  size?: "small" | "medium" | "large";
  meta: PanelMetaInfo;
}>();
const loginUri = computed(() => {
  if (!props.meta) return;
  return `${props.meta.settings.domain ?? `${window.location.protocol}//${window.location.host}`}/api/auth/discord/login?return_uri=${route.fullPath}`;
});
</script>

<template>
  <UButton 
    style="background-color: #4641D9;"
    :href="loginUri"
    class="p-3"
    :avatar="{
      src: '/img/providers/fluxer.svg',
      loading: 'lazy'
    }"
  >Login with Fluxer</UButton>

</template>

<script setup lang="ts">
import { computed} from 'vue'
import { useRoute } from 'vue-router'
const route = useRoute()

const { meta } = await usePanelMeta()

const props = defineProps<{
  size?: "small" | "medium" | "large",
}>()
const loginUri = computed(() => {
  if(!meta.value) return
  return `${meta.value.settings.domain ?? `${window.location.protocol}//${window.location.host}`}/api/auth/fluxer/login?return_uri=${route.fullPath}`
})
</script>

<template>
  <UButton v-show="!props.action.isHidden || props.showHidden" variant="outline" color="neutral" :size="size" :loading="loading" @click="executeAction()">
    {{ props.action.name }}
  </UButton>
</template>

<script setup lang="ts">
import type { ServerAction } from '@common/Server';

const toast = useToast();

const props = withDefaults(defineProps<{
  serverId: string,
  action: ServerAction,
  size?: "sm" | "lg" | "xs",
  showHidden?: boolean
}>(), {
  size: "sm",
  showHidden: false
})

const loading = ref(false)

async function executeAction() {
  if(loading.value) return
  loading.value = true
  const response = await request(`/api/servers/${props.serverId}/action/${props.action.command}`, { method: "POST" })
  loading.value = false
  if ('error' in response) {
    toast.add({
      color: "error",
      title: `${props.action.name} failed`,
      description: response.error.message,
    })
  } else {
    toast.add({
      color: "success",
      title: `${props.action.name} succeeded`,
    })
  }
}
</script>

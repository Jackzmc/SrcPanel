<template>
  <UButton variant="outline" color="neutral" :size="size" :loading="loading" @click="executeAction()">
    {{ props.action.name }}
  </UButton>
</template>

<script setup lang="ts">
import type { APIListServersV2_Server, ServerAction } from '@common/Server';

const toast = useToast();

const props = withDefaults(defineProps<{
  server: APIListServersV2_Server,
  action: ServerAction,
  size?: "sm" | "lg"
}>(), {
  size: "sm",
})

const loading = ref(false)

async function executeAction() {
  if(loading.value) return
  loading.value = true
  const response = await request(`/api/servers/${props.server.id}/action/${props.action.command}`, { method: "POST" })
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

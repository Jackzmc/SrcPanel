<template>
  <UTooltip :text="props.action.description">
    <UButton
v-if="!props.action.isHidden || props.showHidden"
      class="cursor-pointer"
      :variant="attrs.variant"
:color="attrs.color"
      :style="{'background-color': props.action.color}"
      :size="size"
      :loading="loading"
      @click="executeAction()"
    >
      {{ props.action.name }}
    </UButton>
  </UTooltip>
</template>

<script setup lang="ts">
import type { ServerAction } from '@jzpanel/common/Server';

const toast = useToast();
const { promptConfirm } = useModal();

const props = withDefaults(defineProps<{
  serverId: string,
  action: ServerAction,
  size?: "sm" | "lg" | "xs",
  showHidden?: boolean
}>(), {
  size: "sm",
  showHidden: false
})

const attrs = computed<{ color: "neutral" | undefined, variant: "outline" | "solid" }>(() => {
  if(!props.action.color) return { variant: 'outline', color: 'neutral' }
  return { variant: 'solid', color: undefined }
})

const loading = ref(false)

async function executeAction() {
  if(loading.value) return
  loading.value = true
  if(props.action.isHidden) {
    const result = await promptConfirm({
      title: "Confirm Action",
      description: `Are you sure you want to the command "${props.action.command}"`,
      okColor: 'warning',
      okText: 'Yes',
      cancelText: 'No',
    })
    if(!result) {
      toast.add({
        color: 'info',
        description: 'Action cancelled',
        duration: 1200
      })
      loading.value = false
      return
    }
  }
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

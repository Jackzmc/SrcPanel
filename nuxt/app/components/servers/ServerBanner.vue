<template>
  <div class="bg-light-blue p-4 rounded-2xl">
    <div class="flex justify-between">
      <!-- Left side -->
      <div class="flex flex-col">
        <!-- Title/desc -->
        <div class="flex flex-col">
          <h2 class="text-2xl font-bold">{{ server?.name }}</h2>
          <p class="text-gray-600">
            {{ server?.ip }}:{{ server?.port }}
            <UTooltip text="Click to copy IP">
              <UIcon class="cursor-pointer" name="lucide-copy" @click="copyIp" />
            </UTooltip>
          </p>
        </div>

        <!-- Tags -->
        <div class="flex gap-1 mt-4">
          <UBadge v-for="tag in server.tags" :key="tag" color="neutral">{{ tag }}</UBadge>
        </div>
      </div>
      <!-- Right side -->
      <div class="flex flex-col justify-between items-end">
        <!-- Upper status badges -->
        <div class="flex gap-1">
          <ClientOnly>
            <UBadge
              :leading-icon="server.online ? 'lucide:circle' : 'lucide:square'"
              :color="server.online ? 'success' : 'error'"
            >{{ server.online ? 'Online' : 'Offline' }}</UBadge>
            <!-- TODO: live status. hydration mismatch -->
            <UBadge color="primary"
              :leading-icon="liveStatusAttr.leadingIcon"
              :ui="liveStatusAttr.ui"
            >Live</UBadge>
            <UTooltip text="Server Id"><UBadge variant="outline" color="neutral">{{ server.id }}</UBadge></UTooltip>
          </ClientOnly>
        </div>
        <!-- Actions -->
        <div class="flex gap-1">
          <ActionButton v-for="action in server.actions" :key="action.name"
            :server-id="server.id"
            :action="action"
            :show-hidden="showHiddenActions"
            size="xs" />
          <UTooltip text="Show hidden actions">
            <UButton variant="outline" color="neutral"
              size="xs"
              :leading-icon="showHiddenActions ? 'lucide:chevron-left' : 'lucide:chevron-right'"
              @click="showHiddenActions = !showHiddenActions" />
          </UTooltip>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ServerInfo } from '@common/Server';
import ActionButton from '@/components/servers/ActionButton.vue'
import type { LiveServerStatus } from '~/composables/server/live';

const toast = useToast()

const props = defineProps<{
  server: ServerInfo,
  liveStatus: LiveServerStatus
}>()

const liveStatusAttr = computed(() => {
  const connected = import.meta.client && props.liveStatus == 'connected'
  return {
    ui: {
      leadingIcon: connected ? '' : 'animate-spin'
    },
    leadingIcon: connected ? 'lucide:circle-check' : 'lucide:loader-circle'
  }
})

const showHiddenActions = ref(false)

async function copyIp() {
  await navigator.clipboard.writeText(`${props.server.ip}:${props.server.port}`);
  toast.add({
    color: 'info',
    description: 'Server IP copied to clipboard',
    icon: 'lucide:copy',
    duration: 2000
  })
}
</script>

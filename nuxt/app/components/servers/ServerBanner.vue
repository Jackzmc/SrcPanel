<template>
  <div class="bg-light-blue p-4 rounded-2xl">
    <div class="flex justify-between">
      <!-- Left side -->
      <div class="flex flex-col">
        <!-- Title/desc -->
        <div class="flex flex-col">
          <h2 class="text-2xl font-bold">{{ data.server?.name }}</h2>
          <p class="text-gray-600 dark:text-gray-400">
            {{ data.server?.ip }}:{{ data.server?.port }}
            <UTooltip text="Click to copy IP">
              <UIcon class="cursor-pointer" name="lucide-copy" @click="copyIp" />
            </UTooltip>
          </p>
        </div>

        <!-- Tags -->

      </div>
      <!-- Right side -->
      <div class="flex flex-col justify-between items-end">
        <!-- Upper status badges -->
        <div class="flex gap-1">
          <ClientOnly>
            <UBadge
              :leading-icon="data.server.online ? 'lucide:circle' : 'lucide:square'"
              :color="data.server.online ? 'success' : 'error'"
            >{{ data.server.online ? 'Online' : 'Offline' }}</UBadge>
            <!-- TODO: live status. hydration mismatch -->
            <UBadge
              :variant="liveStatusAttr.variant ?? 'solid'"
              :color="liveStatusAttr.color ?? 'primary'"
              :leading-icon="liveStatusAttr.leadingIcon"
              :ui="liveStatusAttr.ui"
              :class="liveStatusAttr.class"
            >{{ liveStatusAttr.text }}</UBadge>
            <UTooltip text="Server Id"><UBadge variant="outline" color="neutral">{{ data.server.id }}</UBadge></UTooltip>
          </ClientOnly>
        </div>
        <!-- Actions -->
        <div class="flex gap-1">
          <div class="flex gap-1">
            <UTooltip text="tag">
               <UBadge v-for="tag in data.server.tags" :key="tag" color="neutral">{{ tag }}</UBadge>
            </UTooltip>
            <UTooltip v-for="(enabled, key) in data.server.features" :key="key" text="feature">
              <UBadge v-if="enabled" variant="outline">
                {{ key }}
              </UBadge>
            </UTooltip>
          </div>
          <!-- <ActionButton v-for="action in server.actions" :key="action.name"
            :server-id="server.id"
            :action="action"
            :show-hidden="showHiddenActions"
            size="xs" />
          <UTooltip text="Show hidden actions">
            <UButton variant="outline" color="neutral"
              size="xs"
              :leading-icon="showHiddenActions ? 'lucide:chevron-left' : 'lucide:chevron-right'"
              @click="showHiddenActions = !showHiddenActions" />
          </UTooltip> -->
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ServerDetailed, ServerInfo } from '@common/Server';
import ActionButton from '@/components/servers/ActionButton.vue'
import type { LiveServerStatus } from '~/composables/server/live';

const toast = useToast()

const props = defineProps<{
  data: ServerDetailed,
  liveStatus: LiveServerStatus
}>()

const liveStatusAttr = computed(() => {
  if(import.meta.client) {
      if(props.liveStatus == 'connecting') {
      return {
        ui: {
          leadingIcon: 'animate-spin'
        },
        variant: 'subtle',
        leadingIcon: 'lucide:loader-circle',
        text: "Connecting"
      }
    } else if(props.liveStatus == 'connected') {
      if(props.data.live != null) {
        return {
          leadingIcon: 'lucide:radio',
          text: "Live"
        }
      } else {
        return {
          ui: {
            leadingIcon: 'animate-pulse'
          },
          variant: 'subtle',
          leadingIcon: 'lucide:radio',
          text: "No Data"
        }
      }
    }
  }
  return {
    color: 'error',
    leadingIcon: 'lucide:radio-off',
    text: "Disconnected"
  }
})

const showHiddenActions = ref(false)

async function copyIp() {
  await navigator.clipboard.writeText(`${props.data.server.ip}:${props.data.server.port}`);
  toast.add({
    color: 'info',
    description: 'Server IP copied to clipboard',
    icon: 'lucide:copy',
    duration: 2000
  })
}
</script>

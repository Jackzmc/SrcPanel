<template>
  <UCard :ui="{ body: 'p-3 sm:p-2' }">
    <div class="flex justify-between">
      <div class="flex flex-row gap-2 items-center">
        <UAvatar v-if="entry.type != 'INFO'" :src="avatarUrl"  :as="{ img: 'img' }" size="3xl" />
        <div class="flex flex-col gap-1">
          <div class="space-x-2 text-xs">
            <UBadge variant="outline" size="sm"> #{{ entry.id }} </UBadge>
            <strong>{{ formatDate(entry.timestamp) }}</strong>
            <span class="text-muted">{{ getRelDate(entry.timestamp) }}</span>
          </div>
          <div class="space-x-2 flex items-start">
            <UBadge :style="typeStyle" :leading-icon="typeData?.icon" :class="typeData?.className">{{ typeData?.label ?? entry.type }}</UBadge>
            <LogMessage :message="entry.message" :client="client" :target="target" :metadata="entry.metadata" />
          </div>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <UTooltip text="Server event occurred on">
          <UBadge v-if="entry.server" size="md">{{ entry.server ?? '?' }}</UBadge>
          <UBadge v-else size="md" variant="outline">Unknown Server</UBadge>
        </UTooltip>
        <UTooltip :text="expanded ? 'Click to hide details' : 'Click to show more details'">
          <UButton
            :leading-icon="expanded ? 'lucide:chevron-up' : 'lucide:chevron-down'"
            variant="outline" color="neutral" size="xl"
            @click="expanded = !expanded"
          />
        </UTooltip>
      </div>
    </div>
    <!-- <div v-if="expanded" class="p-2">
      <div class=" border-t-2 border-t-gray-200">
        EXTRA STUFF HERE
      </div>
    </div> -->
  </UCard>
  <UCard v-if="expanded" class="mt-1 mb-4 ml-5" variant="subtle" :ui="{ body: 'p-0 sm:p-0' }">
    <KeyValueTable>
      <KeyValueRow label="Id">
        <div class="flex gap-2">
          <UBadge variant="outline"> #{{ entry.id }} </UBadge>
          <UButton leading-icon="lucide:copy" color="neutral" variant="outline" @click="copyId">Share</UButton>
          <UButton>find nearby entries</UButton>
        </div>
      </KeyValueRow>
      <KeyValueRow label="Timestamp">
        {{ formatDate(entry.timestamp) }}
      </KeyValueRow>
      <KeyValueRow label="Client Id">
        {{ entry.client ?? '-' }}
      </KeyValueRow>
      <KeyValueRow label="Target Id">
        {{ entry.target ?? '-' }}
      </KeyValueRow>
      <KeyValueRow label="Raw Message" value-class="!px-2 bg-neutral-100">
        <pre class="text-wrap">{{ entry.message }}</pre>
      </KeyValueRow>
      <KeyValueRow v-if="entry.metadata" label="Metadata">
        <KeyValueTable>
          <KeyValueRow v-for="value,key in entry.metadata" :key="key" :label="key">
            {{ value }}
          </KeyValueRow>
        </KeyValueTable>
      </KeyValueRow>
    </KeyValueTable>
  </UCard>
</template>

<script setup lang="ts">
import type { LogEntry } from '@common/Logs';
import { parseLogMessage, type LogEntryUser } from '@common/methods/logs'
import KeyValueTable from '../table/KeyValueTable.vue';
import KeyValueRow from '../table/KeyValueRow.vue';
import { formatDate, getRelDate } from '@common/methods/format';
import LogMessage from './LogMessage.vue';

const toast = useToast()

const TYPE_MAP: Record<string, { icon: string, color?: string, className?: string, label?: string }> = {
  "INFO": {
    icon: "lucide:info",
    color: "var(--ui-info)",
    className: "bg-info"
  },
  "QUIT": {
    icon: "lucide:door-open",
    color: "var(--ui-error)",
    className: "bg-error"
  },
  "JOIN": {
    icon: "lucide:plus",
    color: "var(--ui-success)",
    className: "bg-success"
  },
  "ACTION": {
    icon: "lucide:sparkle",
    color: "var(--ui-warning)",
    className: "bg-warning"
  },
  "STATE": {
    icon: "lucide:activity",
    className: "bg-light-blue text-black dark:text-white"
  },
  "CHAT": {
    icon: "lucide:message-circle",
    className: "bg-neutral-200 text-black"
  },
  "web": {
    icon: "lucide:globe",
    label: "WEB"
  }
}

const props = defineProps<{
  entry: LogEntry
}>()

const avatarUrl = computed(() => {
  let user = props.entry.client ?? props.entry.target
  if(!user) return
  return `/api/users/${user}/avatar`
})

const typeData = computed(() => {
  return TYPE_MAP[props.entry.type as string]
})

const typeStyle = computed(() => {
  const data = TYPE_MAP[props.entry.type as string]
  if(data) {
    return {
      'background-color': data.color
    }
  }
  return undefined
})

// TODO: replace by server
const client = computed<LogEntryUser|undefined>(() => props.entry.client && props.entry.client.startsWith('STEAM_') ? { steamid: props.entry.client, name: props.entry.clientName! } : undefined)
const target = computed<LogEntryUser|undefined>(() => props.entry.target && props.entry.target.startsWith('STEAM_') ? { steamid: props.entry.target, name: props.entry.targetName! } : undefined)

const expanded = ref(false)

async function copyId() {
  const link = `${location.protocol}//${window.location.host}${window.location.pathname}?id=${props.entry.id}`
  await window.navigator.clipboard.writeText(link)
  toast.add({
    color: "info",
    title: "Copied to clipboard",
    description: link
  })
}
</script>

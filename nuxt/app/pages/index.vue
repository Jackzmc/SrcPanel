<template>
  <UContainer class="py-6 fluid">
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
      <div class="col-span-2">
        <div v-if="!groups&&pending" class="flex justify-center py-12">
          <UIcon name="i-lucide-loader-circle" class="animate-spin size-8" />
        </div>
        <div v-else-if="error" class="py-12">
          <UAlert color="error" title="Failed to load servers" :description="error.message" />
        </div>
        <ServersServerGroupList v-else-if="groups" :groups="groups" />
      </div>
      <div class="space-y-4">
        <h2 class="text-xl font-semibold mb-4">
          FAQ
        </h2>
        <div class="flex flex-row flex-wrap gap-2">
          <UCard v-for="(entry, i) in FAQ" :key="i" class="bg-info/20 w-full">
            <h3 class="text-l mb-4 font-semibold">
              {{ entry.title }}
            </h3>
            <ul>
              <!-- eslint-disable vue/no-v-html -->
              <li
                v-for="(item, j) in entry.list"
                :key="j"
                :class="[
                  'text-m',
                  entry.listStyle ?? 'list-none',
                  { 'ml-5': entry.listStyle && entry.listStyle != 'list-none' }
                ]"
                v-html="item"
              />
            </ul>
            <!-- eslint-enable vue/no-v-html -->
          </UCard>
        </div>
      </div>
    </div>
  </UContainer>
</template>

<script setup lang="ts">
useHead({
  title: "Overview"
})
import type { APIListServersV1 } from '@common/Server'

const REFRESH_INTERVAL = 1000 * 20

const api = useApi()

interface FAQEntry {
  title: string
  list: string[]
  listStyle?: "list-disc" | "list-decimal" | "list-none"
}
const FAQ: FAQEntry[] = [
  {
    title: "Enabling & opening the dev console",
    list: [
      "Go to <b>Options</b> then <b>Keyboard/Mouse</b>",
      "Enable the option <b>Allow Developer Console</b>",
      "Open the console with the tilda key <code>`</code>, under ESC"
    ],
    listStyle: "list-decimal"
  },
  {
    title: "Server notes",
    list: [
      "Only servers marked <b>5+</b> support 5+ campaign",
      "Directly connecting does not start matchmaking - the server will not be public. See the below section on how to create a lobby:"
    ],
    listStyle: "list-disc"
  },
  {
    title: "To create a lobby to a server",
    list: [
      "Create a normal lobby, <b>you need to be the host</b>",
      "Select <b>Best Available Dedicated</b> (not Official, or Local)",
      "Open the console <em>(see above for instructions)</em>",
      "Copy <b>Create Lobby Command</b> <em>(on the left)</em> and paste and enter in the console",
      "Start the lobby when ready"
    ],
    listStyle: "list-decimal"
  },
  {
    title: "Joining a 5+ server when its full",
    list: [
      "If there is 4 people on a 5+ server, you can still join: Use the <code>connect <b>ip_address</b></code> command shown on the server entries to join",
      "If you get kicked because it's full, wait a few seconds for people to finish joining, or you maybe be trying to join a non 5+ server."
    ],
    listStyle: "list-none"
  }
]

const { data: groups, pending, error, refresh } = await useAsyncData<APIListServersV1>(
  'servers',
  () => api('/servers')
)

onMounted(() => {
  setInterval(() => refresh(), REFRESH_INTERVAL)
})
</script>

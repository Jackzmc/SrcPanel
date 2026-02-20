<template>
  <UContainer>
    <div class="grid grid-cols-3 gap-6">
      <div class="col-span-2">
        <div v-if="pending" class="flex justify-center py-12">
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
        <UCard v-for="(entry, i) in FAQ" :key="i" class="bg-info/20">
          <h3 class="text-l mb-4 font-semibold">
            {{ entry.title }}
          </h3>
          <span class="text-m" v-html="entry.content" />
        </UCard>
      </div>
    </div>
  </UContainer>
</template>

<script setup lang="ts">
import type { APIListServersV1 } from '@common/Server'

const api = useApi()

const FAQ = [
  {
    title: "Enabling & opening the dev console",
    content: `<ul>
      <li>Go to <b>Options</b> then <b>Keyboard/Mouse</b></li>
      <li>Enable the option <b>Allow Developer Console</b></li>
      <li>Open the console with the tilda key <code>\`</code>, under ESC</li>
    </ul>`
  },
  {
    title: "Enabling & opening the dev console",
    content: `<ul>
      <li>Go to <b>Options</b> then <b>Keyboard/Mouse</b></li>
      <li>Enable the option <b>Allow Developer Console</b></li>
      <li>Open the console with the tilda key <code>\`</code>, under ESC</li>
    </ul>`
  },
]

const { data: groups, pending, error } = await useAsyncData<APIListServersV1>(
  'servers',
  () => api('/servers')
)
</script>

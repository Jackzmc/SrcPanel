<template>
  <div v-if="view === 'cards'">
    <div v-for="group of groups" :key="group.id" class="mb-8">
      <h2 class="text-xl font-semibold mb-4">{{ group.name }}</h2>
      <div v-if="Object.keys(group.servers).length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
        <ServersServerCard v-for="server in group.servers" :key="server.id" :group="group" :server="server" />
      </div>
      <div v-else class="py-0 text-muted">
        No servers in this group
      </div>
    </div>
  </div>
  <div v-else>
    <table v-for="group in groups" :key="group.id">
      <thead>

      </thead>
      <tbody>
        <tr v-for="server in group.servers" :key="server.id">
          <td>{{ server.name }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import type { APIListServersV1 } from '@jzpanel/common/Server'

withDefaults(defineProps<{
  groups: APIListServersV1,
  view: "cards" | "table"
}>(), {
  view: "cards"
})
</script>

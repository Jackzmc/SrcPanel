<template>
  <div>
    <div v-for="group of groups" :key="group.id" class="mb-8">
      <h2 class="text-xl font-semibold mb-2">
        {{ group.name }}
      </h2>
      <template v-if="Object.keys(group.servers).length > 0">
        <div v-if="view === 'cards'" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
          <ServersServerCard v-for="server in group.servers" :key="server.id" :group="group" :server="server" />
        </div>
        <ServerTable v-else-if="view === 'table'" :group="group" />
      </template>

      <div v-else class="py-0 text-muted">
        No servers in this group
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { APIListServersV1 } from "@jzpanel/common/Server";
import ServerTable from "./ServerTable.vue";

withDefaults(defineProps<{
  groups: APIListServersV1;
  view?: "cards" | "table";
}>(), {
  view: "table",
});
</script>

<template>
  <div class="div">
    <div class="flex flex-col gap-4">
      <ServerConsole :data="data" :ws="ws" />

      <UAlert
        color="warning"
        title="Console gives you full acess to the server with every command available to you. Every command you use does not run as you but as the server. Access is a privilege and every command used is logged."
      />
    </div>

    <ClientOnly>
      <Teleport to="#sidebar">
        <UCard>Console Info</UCard>
      </Teleport>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import type { ServerDetailed } from "@jzpanel/common/Server";
import ServerConsole from "@/components/servers/ServerConsole.vue";
import type { WebsocketExport } from "~/composables/server/live";

const props = defineProps<{
  data: ServerDetailed;
  ws: WebsocketExport;
  // logs?: string[],
  // wsStatus: WebsocketStatus
}>();

useHead({
  title: `Manage - ${props.data.server.name ?? props.data.server.id} - Server Info`,
});
</script>

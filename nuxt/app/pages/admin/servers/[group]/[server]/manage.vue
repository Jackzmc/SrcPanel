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
        <UCard>
          <h3 class="text-lg font-bold">Actions</h3>

          <div class="py-2 flex flex-wrap gap-2">
            <ActionButton v-for="action in actions" :key="action.name"
              :server-id="data.server.id"
              :action="action"
              show-hidden
              size="xs" />
            <UTooltip text="Show hidden actions">
              <UButton variant="outline" color="neutral"
                size="xs"
                :leading-icon="showHiddenActions ? 'lucide:chevron-left' : 'lucide:chevron-right'"
                @click="showHiddenActions = !showHiddenActions"
              >
                Show Hidden ({{ hiddenActionCount }})
              </UButton>
            </UTooltip>
          </div>
        </UCard>
      </Teleport>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import type { ServerDetailed } from "@srcpanel/common/Server";
import ServerConsole from "@/components/servers/ServerConsole.vue";
import type { WebsocketExport } from "~/composables/server/live";
import ActionButton from "../../../../../components/servers/ActionButton.vue";

const props = defineProps<{
  data: ServerDetailed;
  ws: WebsocketExport;
  // logs?: string[],
  // wsStatus: WebsocketStatus
}>();

useHead({
  title: `Manage - ${props.data.server.name ?? props.data.server.id} - Server Info`,
});

const hiddenActionCount = computed(() => {
  return props.data.server.actions
    .filter(act => act.isHidden)
    .length
})

const actions = computed(() => {
  return props.data.server.actions
    .filter(act => !act.isHidden || showHiddenActions.value)
})

const showHiddenActions = ref(false)
</script>

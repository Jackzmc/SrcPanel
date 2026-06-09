<template>
  <tr :class="['border-b border-b-neutral-400 last:border-0', rowClass]">
    <td class="p-3">
      <div class="flex flex-col">
        <b class="font-semibold flex flex-row gap-1">
          {{ server.name }}
          <div class="flex flex-row flex-wrap gap-1 is-hidden sm:visible">
            <UBadge v-for="tag in server.tags" :key="tag" variant="outline" color="neutral">
              {{ tag }}
            </UBadge>
          </div>
        </b>
        <UTooltip
          text="Create lobby command. Click to copy"
          :content="{
            align: 'start',
            side: 'top',
            sideOffset: 8,
          }"
          arrow
        >
          <code :class="['bg-inherit! p-0! text-muted!']">
            <ClickCopy :text="createLobbyCommand" />
          </code>
        </UTooltip>
        <UTooltip
          text="Direct connect command. Click to copy"
          :content="{
            align: 'start',
            side: 'bottom',
            sideOffset: 8,
          }"
          arrow
        >
          <code :class="['bg-inherit! p-0! text-muted!']">
            <ClickCopy :text="connectCommand" />
          </code>
        </UTooltip>
      </div>
    </td>
    <td class="py-3">
      <div v-if="server.online" class="flex flex-col text-center">
        <span>{{ server.status.data?.map }}</span>
        <UTooltip
          :ui="{
            content: 'h-full',
          }"
          arrow
        >
          <template #content>
            <ul v-if="server.status.data && server.status.data.players.length > 0" class="list-inside list-disc">
              <li v-for="player, i in server.status.data.players" :key="i">
                {{ player }}
              </li>
            </ul>
            <p v-else>
              No players online
            </p>
          </template>
          <span>
            <span class="font-semibold">{{ server.status.data?.players.length }}</span>
            /
            <span class="text-muted">{{ server.status.data?.maxplayers }}</span>
          </span>
        </UTooltip>
      </div>
      <div v-else class="text-center text-error-400 dark:text-error-200">
        <UIcon
          name="i-lucide-square"
          class="size-3"
        />
        Offline
      </div>
    </td>
    <td class="text-center">
      <div class="flex gap-1 justify-center">
        <UButton v-if="server.online" color="info" variant="subtle" size="md">
          <a :href="'steam://connect/' + server.ip + '/' + server.port">Join</a>
        </UButton>
        <UButton v-if="isLoggedIn" color="neutral" variant="subtle" size="md">
          <a :href="'/admin/servers/' + group.id + '/' + server.id">Manage</a>
        </UButton>
      </div>
    </td>
  </tr>
</template>

<script setup lang="ts">
import type { APIListServersV1_Group, APIListServersV1_Server, GroupInfo, ServerInfo } from "@jzpanel/common/Server";
import ClickCopy from "@/components/ClickCopy.vue";

const { isLoggedIn } = useAuth();

const connectCommand = computed(() => {
  return `connect ${props.server.host}:${props.server.port}`;
});

const createLobbyCommand = computed(() => {
  return `mm_dedicated_force_servers ${props.server.ip}:${props.server.port}`;
});

const rowClass = computed(() => {
  if (props.server.online) {
    return props.server.status.data && props.server.status.data?.players.length > 0
      ? "bg-info-100 dark:bg-info-900"
      : "bg-emerald-100 dark:bg-emerald-800";
  }
  return "bg-yellow-50 dark:bg-neutral-900";
});

const props = defineProps<{
  group: GroupInfo | APIListServersV1_Group;
  server: ServerInfo | APIListServersV1_Server;
}>();
</script>

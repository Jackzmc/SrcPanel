<template>
  <div class="space-y-3">
    <UCard class="shadow-md">
      <div class="flex flex-wrap justify-between items-end">
        <div class="flex flex-wrap items-end gap-2 align-bottom">
          <slot name="bar-left" />
        </div>
        <div>
          <div>
            <div v-if="loading" class="text-right">
              <Icon name="lucide:refresh-ccw" class="animate-spin" />
              Refreshing
            </div>
            <slot name="bar-right" />
          </div>
        </div>
      </div>
    </UCard>

    <div v-if="error">
      <UAlert type="error" color="error" title="Error occurred" :description="error.message" />
    </div>

    <slot>
      <UTable
        :data="players"
        :columns="columns"
        class="shadow-lg"
        :ui="{
          base: 'border border-default',
          td: 'text-black dark:text-white',
        }"
      />
    </slot>
  </div>
</template>

<script setup lang="ts">
import { UserComponent } from "#components";
import { getRelDate } from "@jzpanel/common/format";
import type { PlayerEntry } from "@jzpanel/common/User";
import type { TableColumn } from "@nuxt/ui";

const props = defineProps<{
  loading: boolean;
  error?: Error;
  players?: PlayerEntry[];
  showServerColumn?: boolean;
}>();

const columns = computed(() => {
  const columns: TableColumn<PlayerEntry>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => h(UserComponent, {
        user: {
          steamid: row.original.steamid,
          name: row.original.name ?? undefined,
        },
        class: "text-primary font-bold",
      }),
    },
    {
      accessorKey: "country",
      header: "Country",
    },
    {
      accessorKey: "bansCount",
      header: "Bans",
      cell: ({ row }) => h("span", { class: row.original.bansCount == 0 && "text-neutral-600/25" }, row.original.bansCount),
    },
    {
      accessorKey: "notesCount",
      header: "Notes",
      cell: ({ row }) => h("span", { class: row.original.notesCount == 0 && "text-neutral-600/25" }, row.original.notesCount),
    },
    {
      accessorKey: "firstJoinDate",
      header: "First Join",
      cell: ({ row }) => row.original.firstJoinDate ? new Date(row.original.firstJoinDate * 1000).toLocaleString() : "Never",
    },
    {
      accessorKey: "lastJoinDate",
      header: "Last Join",
      cell: ({ row }) => row.original.lastJoinDate ? getRelDate(row.original.lastJoinDate) : "Never",
    },
  ];
  // Hide server if we selected a server
  if (props.showServerColumn) {
    columns.push({
      accessorKey: "server",
      header: "Server",
    });
  }
  return columns;
});
</script>

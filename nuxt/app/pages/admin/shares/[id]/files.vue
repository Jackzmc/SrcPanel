<template>
  <div>
    <div class="flex flex-col gap-4 mb-6">
      <UInput v-model="searchQuery" placeholder="Search files..." icon="i-lucide-search" class="flex-1 w-lg" />
    </div>

    <div v-if="rows && rows.length > 0" class="flex gap-2">
      <UBadge> {{ rows.length }} selected</UBadge>
      <UButton leading-icon="i-lucide-trash" color="error" size="sm" @click="deleteSelected">
        Delete Selected
      </UButton>
    </div>

    <UTable
      ref="table"
      v-model:global-filter="searchQuery"
      :data="addons"
      :columns="columns"
      checkable
      :loading="status === 'pending'"
      sticky="header"
    />
  </div>
</template>

<script setup lang="ts">
import { formatDate, formatSize } from "@srcpanel/common/format";
import type { TableColumn } from "@nuxt/ui";
import type { AddonInfo, ShareInfo } from "@srcpanel/common/Share";
import type { AsyncDataRequestStatus } from "#app";
import { sortHeader } from "#imports";

// This is to stop TS from complaining about use in h()
import ULink from "@nuxt/ui/components/Link.vue";
import UCheckbox from "@nuxt/ui/components/Checkbox.vue";

// fix TS errors
import type { Table } from "@tanstack/vue-table";
import { UProgress } from "#components";

const props = defineProps<{
  share: ShareInfo;
  addons: AddonInfo[];
  status: AsyncDataRequestStatus;
}>();

useHead({
  title: `Maps - ${props.share.name} - Shares`,
});

const columns: TableColumn<AddonInfo>[] = [
  {
    id: "select",
    header: ({ table }) =>
      h(UCheckbox, {
        "modelValue": table.getIsSomePageRowsSelected()
          ? "indeterminate"
          : table.getIsAllPageRowsSelected(),
        "onUpdate:modelValue": (value) =>
          table.toggleAllPageRowsSelected(!!value),
        "aria-label": "Select all",
      }),
    cell: ({ row }) =>
      h(UCheckbox, {
        "modelValue": row.getIsSelected(),
        "onUpdate:modelValue": (value) => row.toggleSelected(!!value),
        "aria-label": "Select row",
      }),
  },
  {
    accessorKey: "filename",
    // header: 'Name',
    cell: ({ row }) => h(ULink, {
      to: { name: "admin-shares-id-files", params: { id: props.share.id }, query: { file: row.original.filename } },
      class: Object.entries(row.original.installInfo ?? {})
        .filter(([, enabled]) => enabled).length > 0 ? "text-blue" : "text-black",
    }, () => row.original.workshop?.title ?? row.original.filename),
    header: sortHeader("Name"),
    meta: {
      class: {
        th: "whitespace-normal w-1/3",
        td: "whitespace-normal break-words",
      },
    },
  },
  {
    accessorKey: "installInfo",
    header: "Enabled On",
    cell: ({ row }) => {
      const list = Object.entries(row.original.installInfo ?? {})
        .filter(([, enabled]) => enabled)
        .map(([destId]) => destId);
      return list.join(", ");
    },
    meta: {
      class: {
        th: "whitespace-nowrap",
      },
    },
  },
  {
    accessorKey: "filesize",
    header: sortHeader("File Size"),
    cell: ({ row }) => formatSize(row.getValue("filesize")),
    meta: {
      class: {
        th: "whitespace-nowrap",
      },
    },
  },
  {
    accessorKey: "lastModified",
    header: sortHeader("Modified At"),
    cell: ({ row }) => formatDate(row.getValue("lastModified"), true),
    meta: {
      class: {
        th: "whitespace-nowrap",
      },
    },
  },
  {
    accessorKey: "downloaded",
    header: sortHeader("Downloaded At"),
    cell: ({ row }) => formatDate(row.getValue("downloaded"), true),
    meta: {
      class: {
        th: "whitespace-nowrap",
      },
    },
  },
];

const rows = computed(() => {
  if (!table.value) return;
  return table.value.tableApi.getSelectedRowModel().rows;
});

const table = useTemplateRef<{ tableApi: Table<AddonInfo> }>("table");
const searchQuery = ref<string | undefined>();

const { promptConfirm } = useModal();

const toast = useToast();

async function deleteSelected() {
  if (!rows.value) return;
  const addons = rows.value;

  if (!await promptConfirm({
    title: `Confirm action`,
    description: `Are you sure you want to delete ${addons.length} addons?`,
    okText: "Delete",
    okColor: "error",
  })) return;

  const abort = new AbortController();

  const instance = toast.add({
    title: `Deleting ${rows.value.length} addons`,
    description: () => h(UProgress, { modelValue: 0, max: addons.length }),
    icon: `lucide:trash`,
    color: "primary",
    duration: 0,
    progress: true,
    close: false,
    actions: [
      {
        label: "Cancel",
        color: "error",
        onClick: () => {
          abort.abort();
          toast.remove(instance.id);
        },
      },
    ],
  });

  let count = 0;
  const updateProgress = () => {
    toast.update(instance.id, {
      description: () => h(UProgress, { modelValue: count, max: addons.length }),
    });
  };

  await Promise.all(addons.map(async (addon) => {
    // TODO: impl fetch()
    await fetch(`/api/shares/${props.share.id}/addons/${addon.id}`, { method: "DELETE" });
    count++;
    updateProgress();
  }));

  toast.remove(instance.id);
}
</script>

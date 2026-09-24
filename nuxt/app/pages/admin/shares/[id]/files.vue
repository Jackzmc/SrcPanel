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
      :data="filteredData"
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
import { ShareItemState, type AddonInfo, type ShareInfo } from "@srcpanel/common/Share";
import type { AsyncDataRequestStatus } from "#app";
import { sortHeader } from "#imports";

// This is to stop TS from complaining about use in h()
import ULink from "@nuxt/ui/components/Link.vue";
import UCheckbox from "@nuxt/ui/components/Checkbox.vue";

// fix TS errors
import type { Table, TableFeatures } from "@tanstack/vue-table";
import { UBadge, UProgress } from "#components";

const { requireAuth } = useAuth()
await requireAuth()

const props = defineProps<{
  share: ShareInfo;
  addons: AddonInfo[];
  status: AsyncDataRequestStatus;
}>();

useHead({
  title: `Files - ${props.share.name} - Shares`,
});

const enabledDests = computed(() => {
  const kv: Record<string, string[]> = {}
  for(const file of props.addons) {
    kv[file.filename] = Object.entries(file.installInfo ?? {})
      .filter(([, enabled]) => enabled)
      .map(([id,]) => id)
  }
  return kv
})

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
    cell: ({ row }) => {
      const dests = enabledDests.value[row.original.filename] ?? []
      return h("div", { class: "flex flex-col"}, [
        h(ULink, {
          to: { name: "admin-shares-id-files", params: { id: props.share.id }, query: { file: row.original.filename } },
          class: [
            dests.length > 0 ? "text-black" : "text-muted",
            { 'line-through text-error opacity-40': row.original.state === ShareItemState.Missing }
          ],
        }, () => row.original.workshop?.title ?? row.original.filename),
        h("span", { class: "flex flex-row gap-1"}, 
          dests.map(dest => h(UBadge, { color: "neutral", variant: "outline", size: "sm" }, dest))
        )
      ])
    },
    header: sortHeader("Name"),
    meta: {
      class: {
        th: "whitespace-normal w-1/3",
        td: "whitespace-normal break-words",
      },
    },
  },
  {
    header: "State",
    cell: ({ row }) => {
      switch(row.original.state) {
        case ShareItemState.Missing: return h(UBadge, { color: "error", variant: "outline", size: "sm" }, "Missing")
        case ShareItemState.Pending: return h(UBadge, { color: "warning", variant: "outline", size: "sm" }, "Resolving")
        case ShareItemState.Ready: return
      }
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
console.debug('rest')

const rows = computed(() => {
  if (!table.value) return;
  return table.value.tableApi.getSelectedRowModel().rows;
});

const filteredData = computed(() => {
  if(!searchQuery.value) return props.addons
  const query = searchQuery.value.toLowerCase()
  return props.addons
    .filter(addon => {
      return addon.filename.toLowerCase().includes(query)
        || (addon.workshop && addon.workshop.title?.toLowerCase().includes(query)) 
        || (addon.collection &&
          (addon.collection.name?.toLowerCase().includes(query) || addon.collection?.id.toLowerCase().includes(query)))

    })
})

const table = useTemplateRef<{ tableApi: Table<TableFeatures, AddonInfo> }>("table");
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

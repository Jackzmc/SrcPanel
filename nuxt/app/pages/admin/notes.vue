<template>
  <div>
    <Hero title="Notes" subtitle="" />
    <UContainer class="fluid">
      <div class="grid grid-cols-0 sm:grid-cols-4 gap-2">
        <div class="col-span-3 order-2 sm:order-1">
          <div class="flex justify-left px-4 mb-2">
            <UPagination
              v-model:page="page"
              :items-per-page="limit"
              :total="data?.totalNotes ?? 0"
            />
          </div>
          <UTable
            v-if="data"
            :data="data.notes"
            :columns="columns"
            class="text-sm w-full"
            :ui="{ td: 'p-0 py-1 px-1', th: 'py-1 px-1' }"
          />
          <div class="flex justify-left pt-4 px-4">
            <UPagination
              v-model:page="page"
              :items-per-page="limit"
              :total="data?.totalNotes ?? 0"
            />
          </div>
        </div>
        <div class="order-1 sm:order-2">
          <UCard class="bg-light-blue">
            <h2 class="text-lg font-bold">
              Showing
              <UInput v-model.lazy="limit" type="number" min="1" max="100" />
              / {{ (data?.totalNotes ?? 0).toLocaleString() }} notes
            </h2>
            <p>
              The color in the ID column represents their reputation.
            </p>
            <div class="py-3">
              <UCard>
                <UFormField label="Search by User">
                  <UInput v-model="search.user" leading-icon="lucide:user" />
                </UFormField>
                <UFormField label="Search by Message">
                  <UInput v-model="search.content" leading-icon="lucide:message-square" />
                </UFormField>
              </UCard>
            </div>
          </UCard>
        </div>
      </div>
    </UContainer>
  </div>
</template>

<script setup lang="ts">
import type { TableColumn } from "@nuxt/ui";
import { getRelDate } from "@jzpanel/common/format";
import type { APINotesResponse, Note } from "@jzpanel/common/Note";

import UserComponent from "@/components/UserComponent.vue";
import { debounce } from "@jzpanel/common/util";

useHead({
  title: "Notes",
  meta: [
    { name: "robots", content: "noindex,nosnippet" },
  ],
});

const api = useApi();
const route = useRoute();

const columns: TableColumn<Note>[] = [
  {
    accessorKey: "id",
    header: "Id",
    // cell: ({ row }) => h(UserComponent, { class: "text-primary font-bold", user: row.original.client })
    meta: {
      class: {
        th: "px-4",
        td: "px-4",
      },
    },
  },
  {
    accessorKey: "client",
    header: "Client",
    cell: ({ row }) => h(UserComponent, { class: "text-primary font-bold", user: row.original.client }),
  },
  {
    accessorKey: "markedBy",
    header: "Added By",
    cell: ({ row }) => h(UserComponent, { class: "text-primary font-bold", user: row.original.markedBy }),
  },
  {
    accessorKey: "createdAt",
    header: "Created At",
    cell: ({ row }) => getRelDate(row.original.createdAt),
  },
  {
    accessorKey: "content",
    header: "Note",
    cell: ({ row }) => row.original.content,
    meta: {
      class: {
        td: "whitespace-normal",
      },
    },
  },
];

const limit = ref(parseInt(route.query.limit as string) || 40);
const page = ref(parseInt(route.query.page as string) || 1);
const search = ref({
  user: "",
  content: "",
});

const params = computed(() => {
  const params = new URLSearchParams();
  if (search.value.user) params.set("search_user", search.value.user);
  if (search.value.content) params.set("search_content", search.value.content);
  params.append("limit", limit.value.toString());
  params.append("page", page.value.toString());
  return params;
});

const { data, refresh } = await useAsyncData<APINotesResponse>(
  "notes",
  () => api(`/notes?${params.value.toString()}`),
  { timeout: 10_000 },
);

const refreshDebounce = debounce(refresh, 500);

watch([limit, page], () => refresh());
watch(search, () => refreshDebounce(), { deep: true });
</script>

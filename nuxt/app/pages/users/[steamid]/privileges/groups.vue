<template>
  <div>
    <UAlert v-if="error" color="error" title="Error while getting admin groups" :description="error.message" />
    <UTable
      v-else
      :data="groups"
      :columns="columns"
      :get-row-id="(row) => row.id.toString()"
    >
      <template #expanded="{ row }">
        <PermissionsList :codes="row.original.codes" :flags="row.original.flags" />
      </template>
    </UTable>
  </div>
</template>

<script setup lang="ts">
import type { APIListAdminGroupsResponse, APIUserDetails } from "@srcpanel/common/User";
import PermissionsList from "@/components/users/permissions/PermissionsList.vue";
import type { TableColumn } from "@nuxt/ui";

import UCheckbox from "@nuxt/ui/components/Checkbox.vue";
import { UButton } from "#components";
import type { PrivilegesEditData } from "../privileges.vue";

const props = defineProps<{
  steamid: string;
  data: APIUserDetails;
}>();

const model = defineModel<PrivilegesEditData>({ required: true })

// can we do a v-model?

const { data: groups, error } = await useFetch(() => `/api/admins/groups`, {
  transform: (res: APIListAdminGroupsResponse) => res.groups,
});

const columns: TableColumn<APIListAdminGroupsResponse["groups"][0]>[] = [
  {
    id: "select",
    header: "",
    cell: ({ row }) =>
      h(UCheckbox, {
        modelValue: model.value.groups.has(row.original.id),
        "onUpdate:modelValue": (checked) => {
          if(checked)
            model.value.groups.add(row.original.id)
          else
            model.value.groups.delete(row.original.id)
        },
        "aria-label": "Select row",
      }),
  },
  {
    id: "expand",
    cell: ({ row }) =>
      h(UButton, {
        "color": "neutral",
        "variant": "ghost",
        "icon": "i-lucide-chevron-down",
        "square": true,
        "aria-label": "Expand",
        "ui": {
          leadingIcon: [
            "transition-transform",
            row.getIsExpanded() ? "duration-200 rotate-180" : "",
          ],
        },
        "onClick": () => row.toggleExpanded(),
      }),
  },
  {
    accessorKey: "id",
    header: "Id",
  },
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => h("div", [
      h("div", { class: "font-bold" }, row.getValue("name")),
      row.original.parentId != undefined ? h("em", { class: "text-muted text-xs pl-1" }, `Inherits from #${row.original.parentId}`) : undefined,
    ]),
  },
  {
    accessorKey: "flags",
    header: "Flags",
  },
  {
    accessorKey: "immunity",
    header: "Immunity Level",
  },
];
</script>

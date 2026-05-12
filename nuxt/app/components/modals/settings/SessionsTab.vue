<template>
    <UTable v-if="data" 
        :data="data.sessions" 
        :columns="sessionsColumns" 
        checkable
        ref="table"
        :ui="{ td: 'p-0 py-2 px-3', th: 'py-1 px-3' }"
    />
    <IconText v-else
      leading-icon="lucide:loader-circle" leading-icon-class="animate-spin" 
      class="p-6 text-center" 
      text="Loading sessions" 
    />
    <Teleport to="#footer">
        <UButton v-if="rows?.length > 0" color="error" @click="revokeSelected">Revoke</UButton>
    </Teleport>
</template>


<script setup lang="ts">
import { UButton, UCheckbox } from '#components';
import { formatDate, getRelDate } from '@jzpanel/common/format';
import type { UserPrivilegeCode } from '@jzpanel/common/Privileges';
import type { APISessionList, SessionData, UserData } from '@jzpanel/common/User';
import type { TableColumn } from '@nuxt/ui';
import IconText from '~/components/IconText.vue';

const { promptConfirm } = useModal()
const toast = useToast()
const api = useApi()

const props = defineProps<{
   profile?: UserData<UserPrivilegeCode[]> 
}>()

const sessionsColumns: TableColumn<SessionData>[] = [
    {
    id: 'select',
    // Do not show header checkbox if there isn't other sessions besides our own
    header: ({ table }) => data.value && data.value.sessions.length > 1 ?
      h(UCheckbox, {
        modelValue: table.getIsSomePageRowsSelected()
          ? 'indeterminate'
          : table.getIsAllPageRowsSelected(),
        'onUpdate:modelValue': (value) =>
          table.toggleAllPageRowsSelected(!!value),
        'aria-label': 'Select all'
      }) : undefined,
    // Do not show checkbox on our own session. 
    cell: ({ row }) => row.original.id != data.value?.currentSessionId ?
      h(UCheckbox, {
        modelValue: row.getIsSelected(),
        'onUpdate:modelValue': (value) => row.toggleSelected(!!value),
        'aria-label': 'Select row'
      }) : undefined
  },
  {
    accessorKey: 'id',
    header: 'Id',
    cell: ({row}) => h('span', {class: { 'font-semibold text-primary': row.original.id === data.value?.currentSessionId }}, row.original.id.substring(0, 4))
  },
  {
    accessorKey: 'countryCode',
    header: 'Location',
    cell: ({row}) => h('div', { class: 'flex flex-col'}, [
      h('span', {class: { 'font-semibold': true, 'text-primary': row.original.id === data.value?.currentSessionId }}, row.original.countryCode),
      h('span', {class: 'text-muted'}, row.original.ip)
    ])
  },
  {
    accessorKey: 'loginTime',
    header: 'First Seen',
    cell: ({row}) => h('div', { class: 'flex flex-col'}, [
      h('span', {class: { 'font-semibold': true, 'text-primary': row.original.id === data.value?.currentSessionId }}, formatDate(row.original.loginTime)),
      h('span', {class: 'text-muted'}, getRelDate(row.original.loginTime))
    ])
  },
  {
    accessorKey: 'lastActive',
    header: 'Last Seen',
    cell: ({row}) => h('div', { class: 'flex flex-col'}, [
      h('span', {class: { 'font-semibold': true, 'text-primary': row.original.id === data.value?.currentSessionId }}, row.original.id === data.value?.currentSessionId ? 'Current Session' : formatDate(row.original.lastActive)),
      h('span', {class: 'text-muted'}, getRelDate(row.original.lastActive))
    ])
  },
//   {
//     header: ' ',
//     cell: ({row}) => row.original.id === data.value?.currentSessionId ? undefined : h(UButton, {color: 'error', size: 'sm'}, () => 'Revoke')
//   }
]

const { data, refresh } = useAsyncData(
    () => api<APISessionList>("/auth/sessions")
)

const rows = computed(() => {
  if(!table.value) return;
  return table.value.tableApi.getSelectedRowModel().rows
  // Never actually select our own session
    .filter((row: any) => row.original.id != data.value?.currentSessionId)
})

const table = ref()

async function revokeSelected() {
  if(!rows.value) return

  if(!await promptConfirm({
    title: `Revoke ${rows.value.length} session(s)`,
    description: "This will log out these sessions",
    okText: "Revoke",
    okColor: "error"
  })) return

  refresh()
}
</script>
<template>
  <div>
    <UAlert v-if="error" color="error" title="Error while getting admin groups" :description="error" />
    <UTable v-else :data="groups" :columns="columns" checkable v-model:row-selection="rowSelection" :getRowId="(row) => row.id.toString()" />
  </div>
</template>

<script setup lang="ts">
import type { APIListAdminGroupsResponse, APIUserDetails } from '@common/User'
import type { TableColumn } from '@nuxt/ui';

const emit = defineEmits<{
  (e: 'changes', state: boolean ): void
}>()

const props = defineProps<{
  steamid: string
  data: APIUserDetails
}>()

const { data: groups, error } = await useFetch(() => `/api/admins/groups`, {
  transform: (res: APIListAdminGroupsResponse) => res.groups
})

const defaultState = computed(() => {
  if(!groups.value) return {}
  return Object.fromEntries(groups.value.map(group => {
    const isEnabled = props.data.admin?.groups.some(theirGroup => theirGroup.id === group.id) || false
    return [group.id.toString(), isEnabled]
  }))
})

const rowSelection = ref(defaultState.value)

const hasChanges = computed(() => {
  for(const [id, enabled] of Object.entries(defaultState.value)) {
    if(rowSelection.value[id] != enabled) return true
  }
  return false
})

watch(hasChanges, () => {
  emit("changes", hasChanges.value)
})

import UCheckbox from '@nuxt/ui/components/Checkbox.vue'
const columns: TableColumn<APIListAdminGroupsResponse['groups'][0]>[] = [
  {
    id: 'select',
    header: '',
    cell: ({ row }) =>
      h(UCheckbox, {
        modelValue: row.getIsSelected(),
        'onUpdate:modelValue': (value: boolean | 'indeterminate') => row.toggleSelected(!!value),
        'aria-label': 'Select row'
      })
  },
  {
    accessorKey: 'id',
    header: 'Id'
  },
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({row}) => h('div', [
      h('div', { class: 'font-bold' }, row.getValue('name')),
      row.original.parentId != undefined ? h('em', { class: 'text-muted text-xs pl-1' }, `Inherits from #${row.original.parentId}`) : undefined
    ])
  },
  {
    accessorKey: 'flags',
    header: 'Flags'
  },
  {
    accessorKey: 'immunity',
    header: 'Immunity Level'
  },
]
</script>

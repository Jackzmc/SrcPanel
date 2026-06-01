<template>
  <div>
    <UFormField label="Base Immunity Level">
      <UInput v-model="editData.immunityLevel" type="number" :min="0" />
    </UFormField>
    <div class="my-2">
      <PermissionsList 
        :codes="editData.codes" :flags="editData.flags" 
        edit
        @update:flags="onFlagsUpdated" 
        @add:code="onCodeAdd"
        @del:code="onCodeDel" />
    </div>
  </div>
  <Teleport to="#buttons">
    <UButton color="success" leading-icon="lucide:save" @click="saveChanges" :disabled="!hasChanges">
      Save Changes
    </UButton>
    <UButton color="warning" leading-icon="lucide:undo-2" @click="revertChanges"  :disabled="!hasChanges">
      Revert Changes
    </UButton>
  </Teleport>
</template>

<script setup lang="ts">
import type { AdminPermissions, APIUserDetails } from '@jzpanel/common/User'
import type { UserPrivilegeCode } from '@jzpanel/common/Privileges'
import PermissionsList from '@/components/users/permissions/PermissionsList.vue'

const { alert } = useModal()
const toast = useToast()

const props = defineProps<{
  steamid: string
  data: APIUserDetails
}>()

// const { editData } = inject('editData')

const addAdminErrors = computed(() => {
  const list: string[] = [
    "Not implemented"
  ]
  return list
})

const hasChanges = computed(() => {
  return props.data.admin?.permissions.base.flags != editData.value.flags
    || props.data.admin?.permissions.base.immunityLevel != editData.value.immunityLevel
    || permissionsDiffer.value
})

const permissionsDiffer = computed(() => {
  if(!props.data.admin || props.data.admin.permissions.base.codes.length !== editData.value.codes.length) return true
  for(let i = 0; i < props.data.admin.permissions.base.codes.length; i++) {
    if(props.data.admin.permissions.base.codes[i] != editData.value.codes[i]) return true
  }
  return false
})

const editData = ref<AdminPermissions<UserPrivilegeCode[]>['base']>(getResetData())
const loading = ref(false)

function getResetData() {
  return JSON.parse(JSON.stringify(props.data.admin?.permissions.base))
}

async function saveChanges() {
  if(addAdminErrors.value.length > 0) {
    return alert({
      title: 'Unable to grant admin',
      subtitle: `${addAdminErrors.value.length} problems prevent you from continuing`,
      body: addAdminErrors.value.join('\n *')
    })
  }

  loading.value = true;
  const result = await request<{ id: string }>(`/api/admins/${props.steamid}`, {
    method: props.data.admin ? 'PUT': 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      immunityLevel: editData.value.immunityLevel,
      flags: editData.value.immunityLevel,
      codes: editData.value.codes
    })
  })

  if('body' in result) {
    toast.add({
      title: props.data.admin ? 'Admin permissions changed' : 'Admin powers granted',
      description: props.data.admin ? `Admin #${props.data.admin.id}` : `Admin #${result.body?.id}`,
      color: 'success'
    })
  } else {
    toast.add({
      title: props.data.admin ? 'Updating admin permissions failed' : 'Error granting admin',
      description: result.error.message,
      color: 'error'
    })
  }
  loading.value = false
}

function revertChanges() {
  editData.value = getResetData()
}

function onCodeAdd(code: UserPrivilegeCode) {
  editData.value.codes.push(code)
}
function onCodeDel(code: UserPrivilegeCode) {
  const index = editData.value.codes.indexOf(code)
  if(index != -1) {
    editData.value.codes.splice(index, 1)
  }
}

function onFlagsUpdated(flags: string) {
  editData.value.flags = flags
}

</script>

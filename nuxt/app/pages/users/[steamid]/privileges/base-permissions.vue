<template>
  <div>
    <UFormField label="Base Immunity Level">
      <UInput v-model="editData.base.immunityLevel" type="number" :min="0" />
    </UFormField>
    <div class="my-2">
      <PermissionsList :codes="data.admin?.permissions.codes" :flags="data.admin?.permissions.flags" edit />

    </div>
  </div>
</template>

<script setup lang="ts">
import type { APIUserDetails } from '@jzpanel/common/User'
import PermissionsList from '@/components/users/permissions/PermissionsList.vue'

defineProps<{
  steamid: string
  data: APIUserDetails
}>()

const { editData } = inject('editData')

</script>

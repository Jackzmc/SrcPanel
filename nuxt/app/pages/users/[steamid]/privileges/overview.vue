<template>
  <div class="space-y-2">
    <UCard class="bg-light-blue">
      <div class="flex flex-row gap-6 p-6 flex-wrap justify-between">
        <div>
          <h4 class="text-md font-semibold">Admin Id</h4>
          <p v-if="data.admin" class="text-center">{{ data.admin.id}}</p>
          <p v-else class="text-center text-muted">-</p>
        </div>
        <div>
          <h4 class="text-md font-semibold">Playtime</h4>
          <p class="text-center text-muted">Unavailable</p>
        </div>
        <div>
          <h4 class="text-md font-semibold">Immunity Level</h4>
          <p v-if="data.admin" class="text-center">{{ data.admin.permissions.immunityLevel }}</p>
          <p v-else class="text-center text-muted">-</p>
        </div>
        <div>
          <h4 class="text-md font-semibold">Flags</h4>
          <p v-if="data.admin" class="text-center">{{ data.admin.permissions.flags }}</p>
          <p v-else class="text-center text-muted">-</p>
        </div>
      </div>
    </UCard>
    <PermissionsList v-if="data.admin" :codes="data.admin.permissions.codes" :flags="data.admin.permissions.flags" class="mx-4" />
    <div v-else>
      <UAlert color="info" title="User is not an admin" description="Apply an admin group or apply base game or panel permissions." />
    </div>
  </div>
</template>

<script setup lang="ts">
import { FLAGS, type APIUserDetails } from '@jzpanel/common/User'
import PermissionsList from '@/components/users/permissions/PermissionsList.vue'

const props = defineProps<{
  steamid: string
  data: APIUserDetails
}>()

const hasRoot = computed(() => props.data.admin?.permissions.flags.includes('z'))
</script>

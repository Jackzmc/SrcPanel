<template>
  <div class="space-y-2">
    <UCard class="bg-light-blue">
      <div class="flex flex-row gap-6 p-6 flex-wrap justify-between">
        <div>
          <h4 class="text-md font-semibold">Admin Id</h4>
          <p v-if="data.admin">{{ data.admin.id}}</p>
          <p v-else class="text-center text-muted">-</p>
        </div>
        <div>
          <h4 class="text-md font-semibold">Playtime</h4>
          <p>Unavailable</p>
        </div>
        <div>
          <h4 class="text-md font-semibold">Immunity Level</h4>
          <p v-if="data.admin">{{ data.admin.permissions.immunityLevel }}</p>
          <p v-else class="text-center text-muted">-</p>
        </div>
        <div>
          <h4 class="text-md font-semibold">Flags</h4>
          <p v-if="data.admin">{{ data.admin.permissions.flags }}</p>
          <p v-else class="text-center text-muted">-</p>
        </div>
      </div>
    </UCard>
    <div v-if="data.admin" class="grid grid-cols-2 gap-4">
      <div>
        <h3 class="font-bold text-lg">Game Permissions</h3>
        <table class="w-full border-collapse my-2 mx-4">
          <tbody>
            <tr v-for="(desc,flag) in FLAGS" :key="flag" class="border-b bg-gray-100">
              <th class="text-left px-5 py-2">{{ desc }}</th>
              <td class="px-5 py-1">
                <UBadge v-if="hasRoot || data.admin.permissions.flags.includes(flag)" color="success" leading-icon="lucide:check" class="w-full">
                  Granted
                </UBadge>
                <UBadge v-else color="error" leading-icon="lucide:x" class="w-full">
                  No permission
                </UBadge>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div>
        <h3 class="font-bold text-lg">Panel Permissions</h3>
        <div class="flex justify-justify-around flex-wrap gap-3 my-2 mx-4">
          <div v-for="code in data.admin.permissions.codes.sort((a,b) => a.length - b.length)" :key="code">
            <div class="text-center px-2 py-2 bg-gray-100">{{ code }}</div>
          </div>
        </div>
      </div>
    </div>
    <div v-else>
      <UAlert color="info" title="User is not an admin" description="Apply an admin group or apply base game or panel permissions." />
    </div>
  </div>
</template>

<script setup lang="ts">
import { FLAGS, type APIUserDetails } from '@common/User'

const props = defineProps<{
  steamid: string
  data: APIUserDetails
}>()

const hasRoot = computed(() => props.data.admin?.permissions.flags.includes('z'))
</script>

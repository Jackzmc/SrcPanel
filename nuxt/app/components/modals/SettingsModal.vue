<template>
  <UModal
    :close="{ onClick: () => emit('close') }"
    title="User Settings"
    default-open
    aria-describedby="User Settings Modal"
    class="w-max max-w-none" 
  >
    <template #description>
      <UTabs v-model="currentTab" :items="tabs" :content="false" value-key="label" class="w-full" />
    </template>
    <template #body>
      <template v-if="currentTab == 'Sessions'">
        <SessionsTab :profile="data" />
      </template>
      <template v-else-if="currentTab == 'Connections'">
        Connections
      </template>
      <template v-else-if="currentTab == 'Developer'">
        Developer
      </template>
    </template>
    <template #footer>
      <div id="footer">

      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { UserPrivilegeCode } from '@jzpanel/common/Privileges';
import type { UserData } from '@jzpanel/common/User';
import type { TableColumn, TabsItem } from '@nuxt/ui';
import SessionsTab from './settings/SessionsTab.vue';

const api = useApi()
const emit = defineEmits<{
  (e: 'close', value?: string): void,
}>()

const tabs: TabsItem[] = [
  {
    label: "Sessions"
  },
  {
    label: "Connections"
  },
  {
    label: "Developer"
  }
]

const currentTab = ref("Sessions")

const { data } = useAsyncData(
  () => api<UserData<UserPrivilegeCode[]>>("/auth/profile")
)

</script>

<template>
  <UModal
    :close="{ onClick: () => emit('close') }"
    title="User Settings"
    default-open
    aria-describedby="User Settings Modal"
    class="w-max max-w-none md:min-w-lg" 
  >
    <template #description>
      <UTabs v-model="currentTab" :items="tabs" :content="false" value-key="label" class="w-full" />
    </template>
    <template #body>
      <SessionsTab v-if="currentTab == 'Sessions'" :profile="data" />
      <template v-else-if="currentTab == 'Connections'">
        Connections
      </template>
      <DeveloperTab v-else-if="currentTab == 'Developer'" :profile="data" />
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
import DeveloperTab from './settings/DeveloperTab.vue';

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

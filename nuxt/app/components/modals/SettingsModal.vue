<template>
  <UModal
    :close="{ onClick: () => emit('close') }"
    title="User Settings"
    default-open
    aria-describedby="User Settings Modal"
    class="w-max max-w-none md:min-w-lg" 
  >
    <template #description>
      <UTabs :items="tabs" :content="false" value-key="value" class="w-full" 
        :modelValue="settingsTab"
        @update:model-value="v => onSwitchTab(v)"
      />
    </template>
    <template #body>
      <SessionsTab v-if="settingsTab == 'sessions'" :profile="data" />
      <ConnectionsTab v-else-if="settingsTab == 'connections'" :profile="data" />
      <DeveloperTab v-else-if="settingsTab == 'dev'" :profile="data" />
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
import ConnectionsTab from './settings/ConnectionsTab.vue';

const api = useApi()
const emit = defineEmits<{
  (e: 'close', value?: string): void,
}>()

const route = useRoute()

const tabs: TabsItem[] = [
  {
    label: "Sessions",
    value: 'sessions',
  },
  {
    label: "Connections",
    value: 'connections'
  },
  {
    label: "Developer",
    value: 'dev'
  }
]

const settingsTab = computed(() => {
  const split = route.hash.split(":")
  const tab = import.meta.client && tabs.find(tab => tab.value === split[1]) 
  return tab ? tab.value : "sessions"
})

const { data } = useAsyncData(
  () => api<UserData<UserPrivilegeCode[]>>("/auth/profile")
)

function onSwitchTab(tab: string|number) {
  location.hash = `#settings:${tab}`
}
</script>

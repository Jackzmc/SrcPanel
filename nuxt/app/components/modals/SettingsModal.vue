<template>
  <UModal
    :close="{ onClick: () => emit('close') }"
    title="User Settings"
    default-open
    aria-describedby="User Settings Modal"
    class="sm:w-max max-w-none md:min-w-lg"
  >
    <template #description>
      <UTabs
        :items="tabs"
        :content="false"
        value-key="value"
        class="w-full"
        :model-value="settingsTab"
        @update:model-value="v => onSwitchTab(v)"
      />
    </template>
    <template #body>
      <Transition :key="settingsTab" mode="out-in" appear>
        <KeepAlive>
          <div>
            <SessionsTab v-if="settingsTab == 'sessions'" :profile="data" />
            <ConnectionsTab v-else-if="settingsTab == 'connections'" :profile="data" />
            <DeveloperTab v-else-if="settingsTab == 'dev'" :profile="data" />
          </div>
        </KeepAlive>
      </Transition>
    </template>
    <template #footer>
      <div id="footer" />
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { UserPrivilegeCode } from "@srcpanel/common/Privileges";
import type { UserData } from "@srcpanel/common/User";
import type { TabsItem } from "@nuxt/ui";
import SessionsTab from "./settings/SessionsTab.vue";
import DeveloperTab from "./settings/DeveloperTab.vue";
import ConnectionsTab from "./settings/ConnectionsTab.vue";

const api = useApi();
const emit = defineEmits<{
  (e: "close", value?: string): void;
}>();

const route = useRoute();

const tabs: TabsItem[] = [
  {
    label: "Sessions",
    value: "sessions",
  },
  {
    label: "Connections",
    value: "connections",
  },
  {
    label: "Developer",
    value: "dev",
  },
];

const settingsTab = computed(() => {
  const hash = route.hash;
  const split = hash.split(":");
  const tab = tabs.find(t => t.value === split[1]);
  return tab?.value ?? "sessions";
});

const { data } = useAsyncData(
  () => api<UserData<UserPrivilegeCode[]>>("/auth/profile"),
);

function onSwitchTab(tab: string | number) {
  navigateTo({ path: route.path, hash: `#settings:${tab}` }, { replace: true });
}
</script>

<template>
  <UModal
    :close="{ onClick: () => emit('close') }"
    title="Create new server instance"
    description="Select a supported server group to continue"
    aria-describedby="Creation Modal"
    :open="true"
    :dismissible="!!error||!!createResult||!selectedGroup"
  >
    <template #body>
      <template v-if="error">
        <template v-if="createError && 'apiError' in createError && createError.apiError.error === 'NO_FREE_RESOURCES'">
          <div class="space-y-2">
            <UAlert v-if="'type' in createError.apiError && createError.apiError.type == 'CPU'" color="error" title="Not enough resources" icon="lucide:cpu">
              <template #description>
                <div>
                  <p class="text-md mb-3">
                    There are not enough system resources available at this time to create a new instance.
                  </p>
                  <p class="text-sm text-white">
                    Average CPU usage
                    ({{ (createError.apiError.cpu.currentLoad*100).toFixed(1) }}%)
                    exceeds threshold of
                    {{ (createError.apiError.cpu.threshold*100).toFixed(1) }}%
                  </p>
                </div>
              </template>
            </UAlert>
            <UAlert v-else-if="'type' in createError.apiError && createError.apiError.type == 'MEMORY'" color="error" title="Not enough resources" icon="lucide:memory">
              <template #description>
                <div>
                  <p class="text-md mb-3">
                    There are not enough system resources available at this time to create a new instance.
                  </p>
                  <p class="text-sm text-white">
                    Available memory
                    ({{ (createError.apiError.memory.percentAvailable*100).toFixed(1) }}%)
                    is under threshold of
                    {{ (createError.apiError.memory.threshold*100).toFixed(1) }}%
                  </p>
                </div>
              </template>
            </UAlert>
            <UAlert v-else color="error" title="Not enough resources" :description="error.subtitle" />
          </div>
        </template>
        <UAlert v-else color="error" :title="error.title" :description="error.subtitle" />
      </template>
      <div v-else-if="createResult" class="space-y-2">
        <UAlert color="success" icon="lucide:circle-check" title="Instance created successfully" />
        <KeyValueTable>
          <KeyValueRow label="Id">
            <NuxtLink class="text-primary" :to="`/admin/servers/${createResult.serverId}`">{{ createResult.serverId }}</NuxtLink>
          </KeyValueRow>
          <KeyValueRow label="IP">
            {{ createResult.hostname }}:{{ createResult.port }}
          </KeyValueRow>
          <KeyValueRow label="Game">
            {{ createResult.type }}
          </KeyValueRow>
          <KeyValueRow label="Connect with">
            <code>connect {{ createResult.hostname }}:{{ createResult.port }}</code>
          </KeyValueRow>
          <KeyValueRow label="Create lobby with">
            <code>mm_dedicated_force_servers {{ createResult.hostname }}:{{ createResult.port }}</code>
          </KeyValueRow>
        </KeyValueTable>
      </div>
      <div v-else-if="creating">
        <p class="mb-2">
          <IconText leading-icon="lucide:loader-circle" leading-icon-class="animate-spin">
            Creating a new instance of
          </IconText>
        </p>
        <GroupInstanceCard
          :group="selectedGroup!"
          class="my-2"
        />
      </div>
      <div v-else-if="selectedGroup">
        <p class="mb-2">
          Creating a new instance of
        </p>
        <GroupInstanceCard
          :group="selectedGroup"
          selected
          class="my-2"
        />
        <p class="font-semibold mt-3">Confirm creation of new server group instance
        </p>
        <p v-if="selectedGroup.currentInstances > 0" class="text-sm">
          There are already <b>{{ selectedGroup.currentInstances }}</b> instances available.
        </p>

        <p class="text-sm text-muted mt-3">
          New instances may be automatically removed after some period of inactivity
        </p>
      </div>
      <div v-else class="flex flex-col gap-4">
        <GroupInstanceCard
          v-for="group in groups"
          :key="group.id"
          :group="group"
          @select="select(group)"
        />
      </div>
    </template>
    <template #footer>
      <div class="flex gap-2">
        <UButton
          v-if="!error&&!createResult"
          color="info"
          label="Create Instance"
          :disabled="selectedGroup == undefined"
          :loading="creating"
          @click="createInstance()"
        />
        <UButton color="neutral" variant="outline" :label="createResult||error?'Close':'Cancel'" @click="emit('close')" />
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { APIListServerGroup, APICreateGroupInstanceResult_Error, APICreateGroupInstanceResult_Ok } from "@jzpanel/common/Server";
import GroupInstanceCard from "~/components/servers/GroupInstanceCard.vue";
import KeyValueRow from "../table/KeyValueRow.vue";
import KeyValueTable from "../table/KeyValueTable.vue";

const emit = defineEmits(["close"]);

const api = useApi();

const { data: groups, error: listError } = await useAsyncData(
  "servers.create.groups",
  () => api<{ groups: APIListServerGroup[] }>("/servers/groups"),
  { transform: (list: { groups: APIListServerGroup[] }) => list.groups.filter(g => g.type === "docker" || g.type === "custom") },
);

const error = computed<{ title: string; subtitle?: string } | undefined>(() => {
  if (listError.value) {
    return {
      title: "Unable to list groups",
      subtitle: listError.value.message,
    };
  } else if (createError.value) {
    if ("error" in createError.value)
      return {
        title: "Failed to create instance",
        subtitle: createError.value.error,
      };
    else {
      return {
        title: "Failed to create instance",
        subtitle: `${createError.value.apiError.error}: ${createError.value.apiError.message}`,
      };
    }
  }
});

const selectedGroup = ref<APIListServerGroup>();
const creating = ref(false);
const createError = ref<{ error: string } | { apiError: APICreateGroupInstanceResult_Error }>();
const createResult = ref<APICreateGroupInstanceResult_Ok>();
function select(group: APIListServerGroup) {
  selectedGroup.value = group;
}

async function createInstance() {
  if (!selectedGroup.value || creating.value) return;
  creating.value = true;
  try {
    const response = await fetch(`/api/groups/${selectedGroup.value.id}/servers?start=1`, {
      method: "POST",
    });
    if (response.ok) {
      createResult.value = await response.json();
    } else if (response.headers.get("content-type")?.includes("application/json")) {
      const json: APICreateGroupInstanceResult_Error = await response.json();
      createError.value = { apiError: json };
    } else {
      createError.value = { error: await response.text() };
    }
  } catch (err: any) {
    createError.value = { error: err?.message ?? err };
  }
}
</script>

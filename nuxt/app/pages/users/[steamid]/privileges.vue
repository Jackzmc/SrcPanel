<template>
  <div class="flex gap-4 mt-4">
    <div>
      <UNavigationMenu
        orientation="vertical"
        :items="items"
        class="w-48 shrink-0"
        default-value="item-0"
        type="single"
      />
      <div v-if="hasChanges" id="buttons" class="flex flex-col p-2 gap-2" />
    </div>
    <div class="flex-1 min-w-0">
      <NuxtPage :steamid="steamid" :data="data" @changes="(val: boolean) => hasChanges = val" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { APIUserDetails } from "@jzpanel/common/User";

definePageMeta({
  tab: "privileges",
});

const props = defineProps<{
  steamid: string;
  data: APIUserDetails;
}>();

const items = [
  { id: "overview", label: "Overview", icon: "i-lucide-info", to: `/users/${props.steamid}/privileges/overview` },
  { id: "groups", label: "Groups", icon: "i-lucide-users", to: `/users/${props.steamid}/privileges/groups` },
  { id: "base-permissions", label: "Base Permissions", icon: "i-lucide-shield", to: `/users/${props.steamid}/privileges/base-permissions` },
  { id: "actions", label: "Actions", icon: "i-lucide-wrench", to: `/users/${props.steamid}/privileges/actions` },
];

const editData = ref({
  groups: props.data.admin?.groups.map(group => group.id) ?? [],
  base: {
    immunityLevel: props.data.admin?.permissions.base.immunityLevel ?? 0,
    flags: props.data.admin?.permissions.base.flags ?? "",
    codes: props.data.admin?.permissions.base.codes ?? [],
  },
});
// TODO: ignore order, better compare
const isGroupsDirty = computed(() => editData.value.groups !== (props.data.admin?.groups.map(g => g.id) || []));
const isBaseDirty = computed(() => editData.value.base.immunityLevel != props.data.admin?.permissions.base.immunityLevel
  || editData.value.base.flags != props.data.admin?.permissions.base.flags
  || editData.value.base.codes != props.data.admin?.permissions.base.codes);

async function saveEdits() {
  // TODO: impl
  alert("Not implemented");
}
function resetEdits() {
  editData.value = {
    groups: props.data.admin?.groups.map(group => group.id) ?? [],
    base: {
      immunityLevel: props.data.admin?.permissions.base.immunityLevel ?? 0,
      flags: props.data.admin?.permissions.base.flags ?? "",
      codes: props.data.admin?.permissions.base.codes ?? [],
    },
  };
}

provide("editData", { editData, save: saveEdits, reset: resetEdits, isGroupsDirty, isBaseDirty });

const hasChanges = computed(() => isBaseDirty.value || isGroupsDirty.value);
</script>

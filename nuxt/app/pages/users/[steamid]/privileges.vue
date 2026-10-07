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
      <div v-show="hasChanges" class="flex flex-col p-2 gap-2">
        <UButton color="success" leading-icon="lucide:save" @click="saveEdits" :disabled="!hasChanges || !hasAnyMeaningfulPermission">
          {{ props.data.admin ? 'Save Changes' : 'Grant Admin' }}
        </UButton>
        <UButton color="neutral" variant="outline" :leading-icon="props.data.admin ? 'lucide:undo-2' : 'lucide:rotate-ccw'" @click="resetEdits">
          {{ props.data.admin ? 'Revert Changes' : 'Reset' }}
        </UButton>
      </div>
      <!-- baseDirty={{ isBaseDirty }} groupsDirty={{ isGroupsDirty }} meaningful={{ hasAnyMeaningfulPermission }} -->
    </div>
    <div class="flex-1 min-w-0">
      <NuxtPage v-model="editData" :steamid="steamid" :data="data" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { APIUserDetails } from "@srcpanel/common/User";

export interface PrivilegesEditData {
  groups: Set<number>,
  base: {
    immunityLevel: number,
    flags: string,
    codes: string[]
  }
}

const { promptConfirm } = useModal()

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

const orgGroupIds = computed(() => new Set(props.data.admin?.groups.map(group => group.id)))

const editData = ref<PrivilegesEditData>({
  groups: structuredClone(orgGroupIds.value),
  base: {
    immunityLevel: props.data.admin?.permissions.base.immunityLevel ?? 0,
    flags: props.data.admin?.permissions.base.flags ?? "",
    codes: props.data.admin?.permissions.base.codes ?? [],
  },
});
const isGroupsDirty = computed(() => orgGroupIds.value?.size != editData.value.groups.size 
  || orgGroupIds.value.difference(editData.value.groups).size > 0);
// Always dirty on non-admin
const isBaseDirty = computed(() => editData.value.base.immunityLevel != props.data.admin?.permissions.base.immunityLevel
  || editData.value.base.flags != props.data.admin?.permissions.base.flags
  || editData.value.base.codes != props.data.admin?.permissions.base.codes
);
// No changes to revert if they aren't an admin
const hasChanges = computed(() => isBaseDirty.value || isGroupsDirty.value);

const hasAnyMeaningfulPermission = computed(() => {
  return editData.value.groups.size > 0 
    || editData.value.base.flags.length > 0 
    || editData.value.base.codes.length > 0
})

async function saveEdits() {
  if(!hasAnyMeaningfulPermission.value) {
    if(!await promptConfirm({
      title: "Confirm Changes",
      description: props.data.admin
        ? `${props.data.user.name} will no longer have any permissions (in game or in this panel). Select a group or add a permission`
        : `${props.data.user.name} will be granted admin but will not have any privileges (neither in game or in this panel). Select a group or add a permission`,
      okText: props.data.admin ? 'Confirm' : 'Grant'
    })) return
  }


  // TODO: impl
  alert("Not implemented");
}
function resetEdits() {
  editData.value = {
    groups: new Set(props.data.admin?.groups.map(group => group.id)),
    base: {
      immunityLevel: props.data.admin?.permissions.base.immunityLevel ?? 0,
      flags: props.data.admin?.permissions.base.flags ?? "",
      codes: props.data.admin?.permissions.base.codes ?? [],
    },
  };
}

provide("editData", { editData, save: saveEdits, reset: resetEdits, isGroupsDirty, isBaseDirty });

// const hasChanges = ref(false)
</script>

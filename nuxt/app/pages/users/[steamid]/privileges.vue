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
        <UButton color="success" leading-icon="lucide:save" 
          @click="saveEdits" 
          :disabled="adminErrors.length > 0 || !hasChanges || !hasAnyMeaningfulPermission"
        >
          {{ props.data.admin ? 'Save Changes' : 'Grant Admin' }}
        </UButton>
        <UButton color="neutral" variant="outline" :leading-icon="props.data.admin ? 'lucide:undo-2' : 'lucide:rotate-ccw'" @click="resetEdits">
          {{ props.data.admin ? 'Revert Changes' : 'Reset' }}
        </UButton>
      </div>
      <UAlert
        v-if="adminErrors.length > 0"
        :title="data.admin ? 'Cannot edit admin due to the following reasons:' : 'Cannot grant admin due to the following reasons:'"
        color="error"
        class="mb-1"
      >
        <template #description>
          <ul class="list-disc list-inside">
            <li v-for="error, i in adminErrors" :key="i">
              {{ error }}
            </li>
          </ul>
        </template>
      </UAlert>
      <!-- baseDirty={{ isBaseDirty }} groupsDirty={{ isGroupsDirty }} meaningful={{ hasAnyMeaningfulPermission }} -->
    </div>
    <div class="flex-1 min-w-0">

      <NuxtPage v-model="editData" :steamid="steamid" :data="data" @refresh="emit('refresh')" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { APIUserDetails } from "@srcpanel/common/User";

const emit = defineEmits(["refresh"])

definePageMeta({
  tab: "privileges",
});

export interface PrivilegesEditData {
  groups: Set<number>,
  base: {
    immunityLevel: number,
    flags: string,
    codes: string[]
  }
}

const { promptConfirm } = useModal()
const { user, hasPermission } = useAuth();
const toast = useToast()

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

const loading = ref(false)
const editData = ref<PrivilegesEditData>({
  groups: structuredClone(orgGroupIds.value),
  base: {
    immunityLevel: props.data.admin?.permissions.base.immunityLevel ?? 0,
    flags: props.data.admin?.permissions.base.flags ?? "",
    codes: props.data.admin?.permissions.base.codes ?? [],
  },
});

import { isSteamIdSame } from '#shared/utils'

const adminErrors = computed(() => {
  const list: string[] = [];
  if (isSteamIdSame(props.data.user.steamid!, user.value!.user.steamid)) list.push("Cannot edit your own profile");
  if (!hasPermission("admins.edit")) list.push("You lack the privileges to edit other users' privileges");
  if (props.data.admin && props.data.admin.permissions.immunityLevel < editData.value.base.immunityLevel) list.push("Immunity level cannot be equal or above to your current level");
  if (props.data.user.bansCount > 0) list.push("Player has bans on record");
  // TODO: add stats hours
  return list;
});

const permissionsDiffer = computed(() => {
  if (!props.data.admin || props.data.admin.permissions.base.codes.length !== editData.value.base.codes.length) return true;
  for (let i = 0; i < props.data.admin.permissions.base.codes.length; i++) {
    if (props.data.admin.permissions.base.codes[i] != editData.value.base.codes[i]) return true;
  }
  return false;
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

  async function saveChanges() {
    if (!props.data.admin && adminErrors.value.length > 0) {
      return alert({
        title: "Unable to grant admin",
        subtitle: `${adminErrors.value.length} problems prevent you from continuing`,
        body: h("ul", { class: "list-inside list-disc" }, adminErrors.value.map((line: string) => h("li", {}, line))),
        okColor: "error",
      });
    }

    loading.value = true;
    const result = await request<{ id: string }>(`/api/admins/${props.steamid}`, {
      method: props.data.admin ? "PUT" : "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        immunityLevel: editData.value.base.immunityLevel,
        flags: editData.value.base.immunityLevel,
        codes: editData.value.base.codes,
      }),
    });

    if ("body" in result) {
      toast.add({
        title: props.data.admin ? "Admin permissions changed" : "Admin powers granted",
        description: props.data.admin ? `Admin #${props.data.admin.id}` : `Admin #${result.body?.id}`,
        color: "success",
      });
    } else {
      toast.add({
        title: props.data.admin ? "Updating admin permissions failed" : "Error granting admin",
        description: result.error.message,
        color: "error",
      });
    }
    loading.value = false;
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

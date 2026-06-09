<template>
  <div>
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
    <UFormField label="Base Immunity Level">
      <UInput v-model="editData.immunityLevel" type="number" :min="0" />
    </UFormField>
    <div class="my-2">
      <PermissionsList
        :codes="editData.codes"
        :flags="editData.flags"
        edit
        @update:flags="onFlagsUpdated"
        @add:code="onCodeAdd"
        @del:code="onCodeDel"
      />
    </div>
  </div>
  <!-- eslint-disable vue/no-multiple-template-root -->
  <Teleport to="#buttons">
    <UButton v-if="hasChanges" color="success" leading-icon="lucide:save" :disabled="adminErrors.length > 0" @click="saveChanges">
      {{ props.data.admin ? 'Save Changes' : 'Grant Admin' }}
    </UButton>
    <UButton v-if="hasChanges" color="neutral" variant="outline" leading-icon="lucide:undo-2" @click="revertChanges">
      Revert Changes
    </UButton>
  </Teleport>
</template>

<script setup lang="ts">
import type { AdminPermissions, APIUserDetails } from "@jzpanel/common/User";
import type { UserPrivilegeCode } from "@jzpanel/common/Privileges";
import PermissionsList from "@/components/users/permissions/PermissionsList.vue";

const { alert } = useModal();
const toast = useToast();
const { user, hasPermission } = useAuth();

const props = defineProps<{
  steamid: string;
  data: APIUserDetails;
}>();

// const { editData } = inject('editData')

const adminErrors = computed(() => {
  const list: string[] = [];
  if (user.value && user.value.user.steamid === props.steamid) list.push("Cannot edit your own profile");
  if (!hasPermission("admins.edit")) list.push("You lack the privileges to edit privileges");
  if (props.data.admin && props.data.admin.permissions.immunityLevel < editData.value.immunityLevel) list.push("Immunity level cannot be equal or above to your current level");
  if (props.data.user.bansCount > 0) list.push("Player has bans on record");
  // TODO: add stats hours
  return list;
});

const hasChanges = computed(() => {
  return props.data.admin?.permissions.base.flags != editData.value.flags
    || props.data.admin?.permissions.base.immunityLevel != editData.value.immunityLevel
    || permissionsDiffer.value;
});

const permissionsDiffer = computed(() => {
  if (!props.data.admin || props.data.admin.permissions.base.codes.length !== editData.value.codes.length) return true;
  for (let i = 0; i < props.data.admin.permissions.base.codes.length; i++) {
    if (props.data.admin.permissions.base.codes[i] != editData.value.codes[i]) return true;
  }
  return false;
});

const editData = ref<AdminPermissions<UserPrivilegeCode[]>["base"]>(getResetData());
const loading = ref(false);

function getResetData() {
  return JSON.parse(JSON.stringify(props.data.admin?.permissions.base));
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
      immunityLevel: editData.value.immunityLevel,
      flags: editData.value.immunityLevel,
      codes: editData.value.codes,
    }),
  });

  if ("body" in result) {
    toast.add({
      title: props.data.admin ? "Admin permissions changed" : "Admin powers granted",
      description: props.data.admin ? `Admin #${props.data.admin.id}` : `Admin #${result.body?.id}`,
      color: "success",
    });
  }
  else {
    toast.add({
      title: props.data.admin ? "Updating admin permissions failed" : "Error granting admin",
      description: result.error.message,
      color: "error",
    });
  }
  loading.value = false;
}

function revertChanges() {
  editData.value = getResetData();
}

function onCodeAdd(code: UserPrivilegeCode) {
  editData.value.codes.push(code);
}
function onCodeDel(code: UserPrivilegeCode) {
  const index = editData.value.codes.indexOf(code);
  if (index != -1) {
    editData.value.codes.splice(index, 1);
  }
}

function onFlagsUpdated(flags: string) {
  editData.value.flags = flags;
}
</script>

<template>
  <div>
    <UFormField label="Base Immunity Level">
      <UInput v-model="model.base.immunityLevel" type="number" :min="0" />
    </UFormField>
    <div class="my-2">
      <PermissionsList
        v-model:codes="model.base.codes"
        v-model:flags="model.base.flags"
        edit
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AdminPermissions, APIUserDetails } from "@srcpanel/common/User";
import type { UserPrivilegeCode } from "@srcpanel/common/Privileges";
import PermissionsList from "@/components/users/permissions/PermissionsList.vue";
import type { PrivilegesEditData } from "../privileges.vue";

const props = defineProps<{
  steamid: string;
  data: APIUserDetails;
}>();

const model = defineModel<PrivilegesEditData>({ required: true })

function onCodeAdd(code: UserPrivilegeCode) {
  model.value.base.codes.push(code);
}
function onCodeDel(code: UserPrivilegeCode) {
  const index = model.value.base.codes.indexOf(code);
  if (index != -1) {
    model.value.base.codes.splice(index, 1);
  }
}

function onFlagsUpdated(flags: string) {
  model.value.base.flags = flags;
}
</script>

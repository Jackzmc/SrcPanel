<template>
  <div class="grid grid-cols-2 gap-4">
    <GamePermissionsList :flags="flags" :edit="edit" @toggle="onFlagToggled" />
    <PanelPermissionsList :codes="codes" :edit="edit" @add="onAdd" @remove="onDel" />
  </div>
</template>

<script setup lang="ts">
import GamePermissionsList from "@/components/users/permissions/GamePermissionsList.vue"
import PanelPermissionsList from "@/components/users/permissions/PanelPermissionsList.vue"
import { type UserPrivilegeCode } from "@jzpanel/common/Privileges";

const emit = defineEmits<{
  (e: 'add:code', code: UserPrivilegeCode): void,
  (e: 'del:code', code: UserPrivilegeCode): void,
  (e: 'update:flag', flag: string, enabled: boolean): void,
}>()

const props = defineProps<{
  flags?: string,
  codes?: string[],
  edit?: boolean
}>()

function onFlagToggled(flag: string, enabled: boolean) {
  emit('update:flag', flag, enabled)
}

function onAdd(code: string) {
  emit('add:code', code as UserPrivilegeCode)
}

function onDel(code: string) {
  emit('del:code', code as UserPrivilegeCode)
}

</script>

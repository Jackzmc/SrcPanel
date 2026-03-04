<template>
  <div class="grid grid-cols-2 gap-4">
    <GamePermissionsList :flags="flags" :edit="edit" />
    <PanelPermissionsList :codes="codes" :edit="edit" />
  </div>
</template>

<script setup lang="ts">
import GamePermissionsList from "@/components/users/permissions/GamePermissionsList.vue"
import PanelPermissionsList from "@/components/users/permissions/PanelPermissionsList.vue"

defineProps<{
  flags?: string,
  codes?: string[],
  edit?: boolean
}>()
</script>

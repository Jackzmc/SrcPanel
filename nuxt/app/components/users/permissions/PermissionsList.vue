<template>
  <div class="grid grid-cols-2 gap-x-4">
    <GamePermissionsList v-model="flags" :edit="edit" />
    <PanelPermissionsList v-model="codes" :edit="edit" />
  </div>
</template>

<script setup lang="ts">
import GamePermissionsList from "@/components/users/permissions/GamePermissionsList.vue";
import PanelPermissionsList from "@/components/users/permissions/PanelPermissionsList.vue";

const props = defineProps<{
  edit?: boolean;
}>();

const flags = defineModel<string>("flags", { required: true })
const codes = defineModel<string[]>("codes", { required: true })

</script>

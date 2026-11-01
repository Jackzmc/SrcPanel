<template>
  <table class="w-full border-collapse my-2">
    <tbody>
      <GamePermissionRow
        v-for="(desc, flag) in FLAGS"
        :key="flag"
        :flag="flag"
        :description="desc"
        :enabled="flags != undefined && flags.includes(flag)"
        :root="hasRoot"
        :edit="edit"
        @toggle="toggleFlag(flag)"
      />
    </tbody>
  </table>
</template>

<script setup lang="ts">
import { FLAGS } from "@srcpanel/common/User";
import GamePermissionRow from "./GamePermissionRow.vue";

const props = defineProps<{
  edit?: boolean;
}>();

const flags = defineModel<string>({ required: true })

const hasRoot = computed(() => flags.value != undefined && flags.value.includes("z"));

function toggleFlag(flag: string) {
  if(flags.value.includes(flag)) {
    flags.value = flags.value.replace(flag, '')
  } else {
    flags.value += flag
  }
}
</script>

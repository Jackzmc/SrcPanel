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
        @toggle="state => emit('toggle', flag, state)"
      />
      <!-- <tr v-for="(desc,flag) in FLAGS" :key="flag" class="border-b bg-gray-100 dark:bg-gray-600">
        <th class="text-left px-5 py-2">{{ desc }}</th>
        <td v-if="edit">
          <UCheckbox label="Granted" size="lg" variant="card" class="bg-neutral-50"
            :checked="flags && (hasRoot || flags.includes(flag))"
            @change="emit('toggle', )"
          />
        </td>
        <td v-else class="px-5 py-1">
          <UBadge v-if="flags && (hasRoot || flags.includes(flag))" color="success" leading-icon="lucide:check" class="w-full">
            Granted
          </UBadge>
          <UBadge v-else color="error" leading-icon="lucide:x" class="w-full">
            No permission
          </UBadge>
        </td>
      </tr> -->
    </tbody>
  </table>
</template>

<script setup lang="ts">
import { FLAGS } from "@jzpanel/common/User";
import GamePermissionRow from "./GamePermissionRow.vue";

const emit = defineEmits<{
  (e: "toggle", flag: string, enabled: boolean): void;
}>();

const props = defineProps<{
  edit?: boolean;
  flags?: string;
}>();

const hasRoot = computed(() => props.flags != undefined && props.flags.includes("z"));
</script>

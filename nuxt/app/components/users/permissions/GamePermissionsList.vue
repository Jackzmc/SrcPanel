<template>
  <table class="w-full border-collapse my-2">
    <tbody>
      <tr v-for="(desc,flag) in FLAGS" :key="flag" class="border-b bg-gray-100">
        <th class="text-left px-5 py-2">{{ desc }}</th>
        <td v-if="edit">
          <UCheckbox :checked="flags && (hasRoot || flags.includes(flag))" label="Granted" size="lg" variant="card" class="bg-neutral-50" />
        </td>
        <td v-else class="px-5 py-1">
          <UBadge v-if="flags && (hasRoot || flags.includes(flag))" color="success" leading-icon="lucide:check" class="w-full">
            Granted
          </UBadge>
          <UBadge v-else color="error" leading-icon="lucide:x" class="w-full">
            No permission
          </UBadge>
        </td>
      </tr>
    </tbody>
  </table>
</template>

<script setup lang="ts">
import { FLAGS } from '@jzpanel/common/User';

const props = defineProps<{
  edit?: boolean,
  flags?: string
}>()

const hasRoot = computed(() => props.flags && props.flags.includes('z'))
</script>

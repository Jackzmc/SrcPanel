<template>
    <tr class="border-b bg-gray-100 dark:bg-gray-600">
        <th class="text-left px-5 py-2">{{ description }}</th>
        <td v-if="edit">
            <UCheckbox label="Granted" size="lg" variant="card" class="bg-neutral-50" 
                :checked="root || enabled" 
                @change="emit('toggle', !enabled)"
            />
        </td>
        <td v-else class="px-5 py-1">
            <UBadge v-if="root || enabled" color="success" leading-icon="lucide:check" class="w-full">
                Granted
            </UBadge>
            <UBadge v-else color="error" leading-icon="lucide:x" class="w-full">
                No permission
            </UBadge>
        </td>
    </tr>
</template>

<script setup lang="ts">

const emit = defineEmits<{
  (e: 'toggle', enabled: boolean): void,
}>()

const props = defineProps<{
    flag: string,
    description: string,
    root?: boolean,
    enabled?: boolean,
    edit?: boolean
}>()

</script>
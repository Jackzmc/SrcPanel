<template>
    <!-- <div class="flex flex-row gap-1 m-1 border-b border-b-neutral-200 pb-1 text-sm">
        {{ entry.message }}
    </div> -->
    <tr class="border-b border-b-neutral-200 last:border-b-0">
        <td class="pr-2 pb-1">
            <UBadge :color="color" :variant="variant" size="sm">{{ entry.type }}</UBadge>
        </td>
        <td class="w-full">{{ entry.message }}</td>
    </tr>
</template>
<script setup lang="ts">
import { UTable } from '#components';
import { formatDate, formatDateSmart, formatRelTime } from '@srcpanel/common/format';
import { type DownloadLogEntry, type DownloadProgress, DownloadState } from '@srcpanel/common/Share';

const props = defineProps<{
    entry: DownloadLogEntry,
}>()

const color = computed(() => {
    switch(props.entry.type) {
        case "ERROR": return "error"
        case "INFO": return "primary"
        case "WARN": return "warning"
        case "DOWNLOAD": return "success"
        default: return "neutral"
    }
})

const variant = computed(() => {
    return undefined
})
</script>
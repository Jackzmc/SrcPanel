<template>
    <div class="flex flex-row gap-1 m-1">
        <UBadge :color="color" :variant="variant">{{ entry.type }}</UBadge>
        {{ entry.message }}
    </div>
</template>
<script setup lang="ts">
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
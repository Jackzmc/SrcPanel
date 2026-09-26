<template>
    <div
        :class="['border border-neutral-100 items-center gap-4 m-0 p-0', bodyClass]"
    >
        <UProgress v-model="progress.downloaded" :max="progress.total" 
            size="xl" :intermediate="intermediate" :color="color" 
            class="h-2 pt-0 mt-0"
        />
        <div class="flex flex-row justify-between items-center gap-1 p-2">
            <h5 class="text-lg font-bold">{{ id }}</h5>
            <p class="text-sm">{{(progress.downloaded/progress.total*100).toFixed(1)}}%</p>
        </div>

        <!-- <h3 v-if="data.state == DownloadState.Downloading" class="text-md text-muted">
            {{ Math.round(data.downloaded/data.total)*100 }}%
        </h3>
        <h3 v-else-if="data.state == DownloadState.Complete" class="text-md text-muted">Done</h3>
        <h3 v-else-if="data.state == DownloadState.Failed" class="text-md text-error">Failed</h3>
        <h3 v-else class="text-md text-muted">Waiting</h3> -->
    </div>

</template>
<script setup lang="ts">
import { type DownloadProgress, DownloadState } from '@srcpanel/common/Share';

const props = defineProps<{
    progress: DownloadProgress,
    id: string
}>()

const color = computed(() => {
    switch(props.progress.state) {
        case DownloadState.Pending: return "neutral"
        case DownloadState.Downloading: return "primary"
        case DownloadState.Complete: return "success"
        case DownloadState.Failed: return "error"
    }
})

const bodyClass = computed(() => {
    switch(props.progress.state) {
        case DownloadState.Pending: return "bg-neutral-200 opacity-20"
        case DownloadState.Downloading: return "bg-light-blue"
        case DownloadState.Complete: return "bg-success-100"
        case DownloadState.Failed: return "bg-error"
    }
    
})

const intermediate = computed(() => {
    return props.progress.state === DownloadState.Pending
})
</script>
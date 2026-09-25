<template>
    <div
        class="flex flex-row border border-neutral-100 items-center gap-4 p-2 bg-light-blue"
    >
        <div class="div">
            <h5 class="text-lg font-bold">{{ id }}</h5>
            <p class="text-sm">50%</p>
        </div>
        <UProgress v-model="progress.downloaded" :max="progress.total" 
            size="xl" :intermediate="intermediate" :color="color" 
        />
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
        case DownloadState.Downloading: "primary"
        case DownloadState.Complete: "success"
        case DownloadState.Failed: "error"
    }
})

const intermediate = computed(() => {
    return props.progress.state === DownloadState.Pending
})
</script>
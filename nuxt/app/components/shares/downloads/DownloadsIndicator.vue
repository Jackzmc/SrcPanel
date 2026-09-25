<template>
    <div>
        {{ ws.items }}
        <div class="div px-4 py-2 pt-0 mb-2 ">
            <h2 class="text-lg font-bold mb-1">Download Queue (N)</h2>
            <div class="grid grid-flow-col gap-1 justify-start items-center">
                <div v-for="[id, data] in ws.items.value.entries()" :key="id" class="flex flex-col items-center justify-center h-15 w-15 border border-success-200 bg-success-100">
                <h2 class="text-md font-bold text-center">#1</h2>
                {{ data.state }}
                {{ id }}
                <h3 class="text-md text-muted">{{ data.downloaded/data.total*100 }}%</h3>
                </div>
                <div class="flex flex-col items-center justify-center h-15 w-15 border border-amber-200 bg-amber-100">
                <h2 class="text-md font-bold text-center">#2</h2>
                <h3 class="text-md text-muted">50%</h3>
                </div>
                <div class="flex flex-col items-center justify-center h-15 w-15 border border-error-200 bg-error-100">
                <h2 class="text-md font-bold text-center">#3</h2>
                <h3 class="text-md text-muted">Failed</h3>
                </div>
                <div class="opacity-50 px-2">...</div>
                <div class="flex flex-col items-center justify-center h-15 w-15 border border-neutral-200 bg-neutral-100 opacity-50">
                <h2 class="text-md font-bold text-center">#4</h2>
                <h3 class="text-md text-muted">Waiting</h3>
                </div>
                <div class="opacity-50 px-2">...</div>
                <div class="flex text-wrap flex-wrap items-center justify-center h-15 w-15 border border-neutral-200 bg-neutral-100 opacity-50">
                10 more
                </div>
            </div>
        </div>
        {{ ws.logs.value }}
    </div>
</template>

<script setup lang="ts">
import type { ShareInfo } from '@srcpanel/common/Share';

const props = defineProps<{
    share: ShareInfo,
    ws: UseShareWSInstance
}>()
</script>
<template>
    <div class="w-full">
        <DownloadModal v-if="active" :share="share" :ws="ws" @close="active = false" />
        <UButton variant="subtle" color="neutral" @click="active = true" size="lg" class="w-full">
            <UIcon name="lucide:download" />
            View Downloads <UBadge v-if="ws.items.value.size" variant="outline" color="neutral">{{ ws.items.value.size }}</UBadge>
        </UButton>
    </div>
</template>

<script setup lang="ts">
import { DownloadState, type ShareInfo } from '@srcpanel/common/Share';
import DownloadModal from './DownloadModal.vue';

const props = defineProps<{
    share: ShareInfo,
    ws: UseShareWSInstance
}>()

const active = ref(false)
</script>
<template>
    <UCard>
        {{ ban }}
    </UCard>
</template>

<script setup lang="ts">
import type { FullAPIBan, ListAPIBan } from '@jzpanel/common/Ban';

const props = defineProps<{
    ban: ListAPIBan | FullAPIBan
}>()
</script>
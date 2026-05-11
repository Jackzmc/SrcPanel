<template>
    <UCard>
        <div class="flex flex-row gap-4">
            <img :src="`/img/providers/${imageName}`" class="w-8 h-8" />
            <div>
                <h3 class="text-lg font-bold">{{ name }}</h3>
                <UBadge v-if="expired" color="error" variant="outline">Expired</UBadge>
                <template v-else-if="data">
                    <p class="text-md text-muted">{{ data.username }}</p>
                </template>
                <template v-else>
                    <p class="text-md text-muted">Not connected</p>
                </template>
            </div>
        </div>
        
    </UCard>
</template>


<script setup lang="ts">
import type { OauthProvider, OauthProviderData } from '@jzpanel/common/User';

const props = defineProps<{
    name: string,
    imageName: string,
    expired?: boolean,
    data?: OauthProviderData | null
}>()
</script>
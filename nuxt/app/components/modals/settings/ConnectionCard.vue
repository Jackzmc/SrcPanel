<template>
    <UCard :ui="{ body: cardClass }">
        <div class="flex flex-row items-center justify-between">
            <div class="flex flex-row items-center gap-4">
                <img :src="`/img/providers/${imageName}`" class="w-8 h-8" />
                <div>
                    <h3 class="text-lg font-bold">{{ name }}</h3>
                    <UBadge v-if="expired" color="error" variant="outline">Expired</UBadge>
                    <template v-else-if="data">
                        <p class="text-md text-muted">{{ data.username }}</p>
                    </template>
                    <p v-else-if="enabled" class="text-md text-muted">Not connected</p>
                    <p v-else class="text-md text-muted">Unavailable</p>
                </div>
            </div>
            <template v-if="enabled">
                <template v-if="name != 'Steam'">
                    <UButton v-if="data">Link Account</UButton>
                    <UButton v-else variant="outline">Unlink Account</UButton>
                </template>
                <p v-else class="text-muted text-sm">Cannot unlink</p>
            </template>
        </div>
    </UCard>
</template>


<script setup lang="ts">
import type { OauthProvider, OauthProviderData } from '@jzpanel/common/User';

const props = withDefaults(defineProps<{
    enabled?: boolean,
    name: string,
    imageName: string,
    expired?: boolean,
    data?: OauthProviderData | null
}>(), { enabled: true })

const cardClass = computed(() => {
    return ['py-2!', props.enabled ? '' : 'opacity-40']
})
</script>
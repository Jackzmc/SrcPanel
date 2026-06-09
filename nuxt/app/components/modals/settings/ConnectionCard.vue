<template>
    <UCard :ui="{ body: 'py-2!' }">
        <div class="flex flex-row items-center justify-between">
            <div class="flex flex-row items-center gap-2 sm:gap-4">
                <img :src="`/img/providers/${imageName}`" class="w-8 h-8" >
                <div>
                    <h3 class="text-lg font-bold">{{ name }}</h3>
                    <UBadge v-if="expired" color="error" variant="outline">Expired</UBadge>
                    <template v-else-if="data">
                        <p class="text-md text-muted">{{ data.username }}</p>
                    </template>
                    <p v-else class="text-md text-dimmed">Not connected</p>
                </div>
            </div>
            <template v-if="!primary">
                <template v-if="!data">
                    <UButton class="hidden sm:block" @click="link()">Link Account</UButton>
                    <UButton class="sm:hidden" size="sm" @click="link()">Link</UButton>
                </template>
                <template v-else>
                    <UButton variant="outline" :loading="unlinking" class="hidden sm:block" @click="unlink()">Unlink Account</UButton>
                    <UButton variant="outline" :loading="unlinking" size="sm" class="sm:hidden" @click="unlink()">Unlink</UButton>
                </template>

            </template>
            <p v-else class="text-muted text-sm">Primary</p>
        </div>
    </UCard>
</template>


<script setup lang="ts">
import type { OauthProvider, OauthProviderData } from '@jzpanel/common/User';

const { promptConfirm } = useModal() 
const toast = useToast()
const route = useRoute()

const emit = defineEmits(["refresh"])

const props = withDefaults(defineProps<{
    id: string,
    enabled?: boolean,
    name: string,
    imageName: string,
    expired?: boolean,
    data?: OauthProviderData | null,
    primary?: boolean
}>(), { enabled: true })

const unlinking = ref(false)

async function link() {
    location.href = `/api/auth/${props.id}/link?return_to=${encodeURI(route.path)}`
}

async function unlink() {
    unlinking.value = true
    if(await promptConfirm({
        title: `Unlink ${props.name} account?`,
        description: `You will need to relogin with ${props.name} to sign in with this account to use it in the future.`,
        okText: 'Unlink',
        okColor: 'warning'
    })) {
        const result = await request(`/api/auth/${props.id}/revoke?json=1`)
        if('body' in result) {
            toast.add({
                title: `${props.name} unlinked successfully`,
                color: 'success'
            })
            emit('refresh')
        } else {
            toast.add({
                title: `Unlinking ${props.name} failed`,
                description: result.error.message,
                color: 'error'
            })
        }
    }
    unlinking.value = false
}
</script>
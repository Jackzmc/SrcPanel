<template>
    <div class="flex flex-col gap-4">
        <ConnectionCard
            name="Steam"
            image-name="steam.png"
            :data="steamData"
        />
        <ConnectionCard v-for="provider in data" :key="provider.id" 
            :name="provider.name" 
            :image-name="provider.id + '.svg'"
            :expired="provider.enabled && provider.expired"
            :data="provider.enabled ? provider.data : undefined"
        />
    </div>
</template>


<script setup lang="ts">
import type { UserPrivilegeCode } from '@jzpanel/common/Privileges';
import type { APIConnections, APIDeveloperGenerateKeyResponse, APIDeveloperResponse, APISessionList, OauthProviderData, SessionData, UserData } from '@jzpanel/common/User';
import ConnectionCard from './ConnectionCard.vue';

const api = useApi()
const props = defineProps<{
   profile?: UserData<UserPrivilegeCode[]> 
}>()
const { user } = useAuth()

const { data, refresh } = await useAsyncData(
    () => api<APIConnections>("/auth/connections")
)

const steamData = computed(() => {
    if(!user.value) return
    const obj: OauthProviderData = {
        id: user.value.user.steamid,
        username: user.value.user.name
    }
    return obj
})
</script>
<template>
    <div class="flex flex-col gap-4">
        <p>Steam accounts are the primary connection and cannot be unlinked</p>
        <ConnectionCard
            name="Steam"
            image-name="steam.png"
            :data="steamData"
        />
        <ConnectionCard v-for="provider in data" :key="provider.id" 
            :enabled="provider.enabled"
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

const enabledConnections = computed(() => {
    if(!data.value) return
    return Object.values(data.value)
        .filter(conn => conn.enabled)
})

const steamData = computed(() => {
    if(!user.value) return
    const obj: OauthProviderData = {
        id: user.value.user.steamid,
        username: user.value.user.name
    }
    return obj
})
</script>
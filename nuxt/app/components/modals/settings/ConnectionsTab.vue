<template>
    <div class="flex flex-col gap-4">
        <p>Steam accounts are the primary connection and cannot be unlinked</p>
        <ConnectionCard
            name="Steam"
            image-name="steam.png"
            :data="steamData"
            enabled
            primary
        />
        <IconText v-if="status == 'pending'" 
            leading-icon="lucide:loader-circle" leading-icon-class="animate-spin" 
            class="p-6 text-center" 
            text="Loading connections" 
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
import type { APIConnections, OauthProviderData, UserData } from '@jzpanel/common/User';
import ConnectionCard from './ConnectionCard.vue';
import IconText from '~/components/IconText.vue';

const api = useApi()
const props = defineProps<{
   profile?: UserData<UserPrivilegeCode[]> 
}>()
const { user } = useAuth()

const { data, status } = useAsyncData(
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
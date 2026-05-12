<template>
    <UCard>
        <h3 class="text-lg font-bold">API Key</h3>
        <p v-if="!data?.apikey" class="text-muted text-sm">
            No key has been created yet
        </p>
        <div class="flex flex-col">
            <template v-if="data?.apikey">
                <div class="flex justify-between">
                    <IconText leading-icon="lucide:calendar"><b>Created </b></IconText>
                    <span>{{ formatDate(data.apikey?.created) }} </span>
                </div>
                <div class="flex justify-between">
                    <IconText leading-icon="lucide:calendar-clock"><b>Last Activity </b></IconText>
                    <span>{{ formatDate(data.apikey?.lastUsed) }} </span>
                </div>
                <div class="flex flex-col justify-between">
                    <IconText leading-icon="lucide:key-square"><b>Key</b></IconText>
                    <pre class="text-wrap">{{ data.apikey.id }}</pre>
                </div>
            </template>
            <div class="mt-1">
                <UButton leading-icon="lucide:rotate-ccw-key" 
                    variant="outline" 
                    :loading="apikeyRolling"
                    @click="regenerate"
                >
                    {{ data?.apikey ? 'Regenerate' : 'Generate' }}
                </UButton>
            </div>
        </div>
    </UCard>
    <Teleport to="#footer">
    </Teleport>
</template>


<script setup lang="ts">
import { UButton, UCheckbox } from '#components';
import { formatDate } from '@jzpanel/common/format';
import type { UserPrivilegeCode } from '@jzpanel/common/Privileges';
import type { APIDeveloperGenerateKeyResponse, APIDeveloperResponse, APISessionList, SessionData, UserData } from '@jzpanel/common/User';

const api = useApi()
const toast = useToast()
const props = defineProps<{
   profile?: UserData<UserPrivilegeCode[]> 
}>()

const { data, refresh } = await useAsyncData(
    () => api<APIDeveloperResponse>("/auth/developer")
)

const apikeyRolling = ref(false)

async function regenerate() {
    apikeyRolling.value = true
    const response = await request<APIDeveloperGenerateKeyResponse>(`/api/auth/developer/apikey`, {
        method: "POST"
    })
    apikeyRolling.value = false
    if('body' in response) {
        refresh()
        toast.add({
            title: "API Key rotated",
            description: response.body!.apikey!.id
        })
    } else {
        toast.add({
            title: "Failed to roll API Key",
            color: "error",
            description: response.error.message
        })
    }
}
</script>
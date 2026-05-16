<template>
    <div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <UCard class="col-span-3 grow">
            <h3 class="text-sm font-bold mb-3 text-muted">EDIT BAN</h3>
            <div class="flex flex-col gap-6">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <UFormField label="Private Reason">
                        <UTextarea v-model="editBan.reason" placeholder="Banned" class="w-full" size="lg" :rows="2" />
                    </UFormField>
                    <UFormField label="Public Reason">
                        <UTextarea v-model="editBan.publicReason" placeholder="Banned" class="w-full" size="lg" :rows="2" />
                    </UFormField>
                </div>
                <UFormField label="Expires">
                    <USelect variant="subtle" placeholder="Set expires date" />
                </UFormField>
                <UFormField label="Flags">
                    <div class="flex flex-row gap-1">
                        <UButton color="error" size="lg"
                            :variant="editBan.flags & APIBanFlags.Suspended ? 'solid' : 'outline'"  
                            @click="toggleFlag(APIBanFlags.Suspended)"
                        >Suspend</UButton>
                        <UButton color="neutral" size="lg"
                            :variant="editBan.flags & APIBanFlags.IPBan ? 'solid' : 'outline'"  
                            @click="toggleFlag(APIBanFlags.IPBan)"
                        >IP Ban</UButton>
                    </div>
                </UFormField>
            </div>
            <br><br><br>
            <template #footer>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                    <div class="flex items-center">
                        <UButton size="xl" class="my-2" :loading="saveActive" @click="save()" :disabled="!canSave">Save Changes</UButton>
                    </div>
                    
                    <div class="flex items-start">
                        <UFormField label="Danger Zone" orientation="horizontal" class="py-2 px-4 border-dashed rounded-lg border w-full" :ui="{root:'items-center'}">
                            <UButton color="error" :loading="saveActive||deleteActive" @click="deleteBan()">Delete Ban</UButton>
                        </UFormField>
                    </div>
                </div>
            </template>
        </UCard>
        <div class="flex flex-col gap-2">
            <UCard class="grow">
                <h3 class="text-sm font-bold mb-2 text-muted">DETAILS</h3>
                <div class="flex flex-col justify-around gap-1">
                    <div v-if="ban !== null" class="flex flex-row justify-between">
                        <h4 class="text-lg font-semibold text-dimmed">Id</h4>
                        <p class="text-black">#{{ ban.id }}</p>
                    </div>
                    <div class="flex flex-row justify-between">
                        <h4 class="text-lg font-semibold text-dimmed">State</h4>
                        <UBadge v-if="!ban" color="primary">New</UBadge>
                        <UBadge v-else-if="ban.expired" color="error" variant="subtle">Expired</UBadge>
                        <UBadge v-else-if="ban.flags & APIBanFlags.Suspended" color="error" variant="subtle">Suspended</UBadge>
                        <UBadge v-else-if="ban.flags & APIBanFlags.AppealBanned" color="success" variant="subtle">Appealed</UBadge>
                        <UBadge v-else color="primary" variant="subtle">Active</UBadge>
                    </div>
                    <div class="flex flex-row justify-between">
                        <h4 class="text-lg font-semibold text-dimmed">IP</h4>
                        <p v-if="editBan.ip" class="text-black">{{ editBan.ip }}</p>
                        <p class="text-muted">--</p>
                    </div>
                    <div class="flex flex-row justify-between">
                        <h4 class="text-lg font-semibold text-dimmed">Expires</h4>
                        <p v-if="editBan.expires" class="text-black">{{ formatDate(editBan.expires) }}</p>
                        <p v-if="editBan.expires" class="text-black">{{ formatRelTime(editBan.expires) }}</p>
                        <p v-else class="text-black">Permanent</p>
                        <!-- <USelect class="w-full">

                        </USelect> -->
                    </div>
                    <div class="flex flex-row justify-between">
                        <h4 class="text-lg font-semibold text-dimmed">Country</h4>
                        <p v-if="editBan.client.country" class="text-black">{{ editBan.client.country }}</p>
                        <p class="text-muted">--</p>
                    </div>
                    <div class="flex flex-row justify-between">
                        <h4 class="text-lg font-semibold text-dimmed">Join Attempts</h4>
                        <p class="text-black">{{ editBan.joinAttempts }}</p>
                    </div>
                    
                </div>
            </UCard>
            <UCard>
                <div class="flex flex-col gap-2">
                    <h4 class="text-sm font-semibold text-muted">BANNED BY</h4>
                    <UserComponent class=" text-black" :user="editBan.executor" />
                </div>
                <template #footer>
                    <h4 class="text-sm font-semibold text-dimmed">ISSUED</h4>
                    <div class="my-2 space-y-1 text-sm">
                        <p class="text-black">{{ formatDateSmart(editBan.timestamp) }}</p>
                        <p class="text-xs text-muted">{{ getRelDate(editBan.timestamp) }}</p>
                    </div>
                </template>
            </UCard>
        </div>
    </div>
</template>

<script setup lang="ts">
import { APIBanFlags, type FullAPIBan, type ListAPIBan } from '@jzpanel/common/Ban';
import { formatDate, formatDateSmart, formatRelTime, getRelDate } from '@jzpanel/common/format';

const toast = useToast()
const { promptConfirm } = useModal()
const { user } = useAuth()

type EditBan = Omit<FullAPIBan, 'id'>

const props = defineProps<{
    ban: FullAPIBan | null
}>()


const hasChanges = computed(() => {
    if(props.ban === null) return true
    return props.ban.expires !== editBan.value.expires
        || props.ban.publicReason !== editBan.value.publicReason
        || props.ban.reason !== editBan.value.reason
        || props.ban.flags !== editBan.value.flags
})

const canSave = computed(() => {
    if(props.ban === null) {
        return editBan.value.reason != ""
            && editBan.value.client.id 
    }
    return hasChanges.value === true
})

const editBan = ref<EditBan>(props.ban || defaultBan())
const saveActive = ref(false)
const deleteActive = ref(false)

function toggleFlag(flag: APIBanFlags) {
    if(editBan.value.flags & flag) {
        editBan.value.flags &= ~flag
    } else {
        editBan.value.flags |= flag
    }
}

async function save() {
    if(props.ban === null) return
    if(!canSave.value) return console.warn('save() called when canSave is false')
    saveActive.value = true
    const result = await request(`/api/bans/${props.ban.id}`, {
        method: "PUT",
        headers: {
            'content-type': 'application/json'
        },
        body: JSON.stringify(editBan.value)
    })
    saveActive.value = false
    if('body' in result) {
        toast.add({
            title: `Ban #${props.ban.id} updated successfully`,
            color: 'success'
        })
    } else {
        toast.add({
            title: `Ban #${props.ban.id} update failed`,
            description: result.error.message,
            color: 'error'
        })
    }
}

function defaultBan(): EditBan {
    return {
        reason: '',
        publicReason: '',
        ip: undefined,
        flags: 0,
        client: {
            id: '',
        },
        executor: {
            id: user.value?.user.steamid!,
            name: user.value?.user.name
        },
        expires: 0,
        expired: false,
        joinAttempts: 0,
        timestamp: Math.ceil(Date.now()/1000)
    }
}

async function deleteBan() {
    if(props.ban === null) return
    deleteActive.value = true
    if(await promptConfirm({
        title: 'Confirm deletion',
        description: 'This will completely purge ban from the records, intended for unintentional bans. It is preferred to suspend the ban instead if the ban is to no longer be active. Are you sure you want to continue?',
        okColor: 'error',
        okText: 'Delete'
    })) {
        const result = await request(`/api/bans/${props.ban.id}`, {
            method: "DELETE",
            headers: {
                'content-type': 'application/json'
            },
        })
        deleteActive.value = false
        if('body' in result) {
            toast.add({
                title: `Ban #${props.ban.id} deleted`,
                color: 'success'
            })
            await navigateTo(`/users/${props.ban.client.id}/bans`)
        } else {
            toast.add({
                title: `Ban #${props.ban.id} deletion failed`,
                description: result.error.message,
                color: 'error'
            })
        }
    }
}
</script>
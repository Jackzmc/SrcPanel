<template>
    <div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <UCard class="col-span-3">
            <h3 class="text-sm font-bold mb-2 text-muted">EDIT BAN</h3>
            <div class="flex flex-col gap-4">
                <div class="flex flex-col gap-4">
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
                    <hr class="text-neutral-300 py-1 mt-4">
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                        <div class="flex items-center">
                            <UButton size="xl" class="my-2">Save Changes</UButton>
                        </div>
                        
                        <div class="flex items-center">
                            <UFormField label="Danger Zone" class="border-dashed rounded-lg border py-2 px-4 w-full" orientation="horizontal">
                                <UButton color="error">Delete Ban</UButton>
                            </UFormField>
                        </div>
                    </div>
                </div>
            </div>
        </UCard>
        <div class="flex flex-col gap-2">
            <UCard class="grow">
                <h3 class="text-sm font-bold mb-2 text-muted">DETAILS</h3>
                <div class="flex flex-col justify-around gap-1">
                    <div class="flex flex-row justify-between">
                        <h4 class="text-lg font-semibold text-dimmed">Id</h4>
                        <p class="text-black">#{{ ban.id }}</p>
                    </div>
                    <div class="flex flex-row justify-between">
                        <h4 class="text-lg font-semibold text-dimmed">State</h4>
                        <UBadge v-if="ban.expired" color="error" variant="subtle">Expired</UBadge>
                        <UBadge v-else-if="ban.flags & APIBanFlags.Suspended" color="error" variant="subtle">Suspended</UBadge>
                        <UBadge v-else-if="ban.flags & APIBanFlags.AppealBanned" color="success" variant="subtle">Appealed</UBadge>
                        <UBadge v-else color="primary" variant="subtle">Active</UBadge>
                    </div>
                    <div class="flex flex-row justify-between">
                        <h4 class="text-lg font-semibold text-dimmed">IP</h4>
                        <p v-if="ban.ip" class="text-black">{{ ban.ip }}</p>
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
                        <p v-if="ban.client.country" class="text-black">{{ ban.client.country }}</p>
                        <p class="text-muted">--</p>
                    </div>
                    <div class="flex flex-row justify-between">
                        <h4 class="text-lg font-semibold text-dimmed">Join Attempts</h4>
                        <p class="text-black">{{ ban.joinAttempts }}</p>
                    </div>
                    
                </div>
            </UCard>
            <UCard>
                <div class="flex flex-col gap-2">
                    <h4 class="text-sm font-semibold text-muted">BANNED BY</h4>
                    <UserComponent class=" text-black" :user="ban.executor" />
                </div>
                <template #footer>
                    <h4 class="text-sm font-semibold text-dimmed">ISSUED</h4>
                    <div class="my-2 space-y-1 text-sm">
                        <p class="text-black">{{ formatDateSmart(ban.timestamp) }}</p>
                        <p class="text-xs text-muted">{{ getRelDate(ban.timestamp) }}</p>
                    </div>
                </template>
            </UCard>
        </div>
    </div>
</template>

<script setup lang="ts">
import { APIBanFlags, type FullAPIBan, type ListAPIBan } from '@jzpanel/common/Ban';
import { formatDate, formatDateSmart, formatRelTime, getRelDate } from '@jzpanel/common/format';

const props = defineProps<{
    ban: FullAPIBan
}>()

const editBan = ref<FullAPIBan>(props.ban)

function toggleFlag(flag: APIBanFlags) {
    if(editBan.value.flags & flag) {
        editBan.value.flags &= ~flag
    } else {
        editBan.value.flags |= flag
    }
}
</script>
<template>
  <UModal open title="Download Queue" @update:open="$emit('close')" class="min-w-200" :ui="{ body: 'pt-1!'}">
    <template #body >
        <UTabs v-model="tab" :items="tabs" :ui="{content: 'pt-4'}">
            <template #content="{ item }">
                <template v-if="tab == 'items'">
                    <div class="grid grid-flow-row gap-1 items-start">
                        <DownloadItem v-for="[id, data] in ws.items.value.entries()"
                            :key="id"
                            :progress="data"
                            :id="id"
                        />
                    </div>
                    <p v-if="ws.items.value.size === 0" class="text-muted text-center">No items in queue</p>
                </template>
                <template v-else-if="tab == 'logs'">
                    <p class="text-muted text-sm pb-2">Logs are shown in ascending order</p>
                    <table class="table-auto text-left text-sm">
                        <tbody>
                            <DownloadLog v-for="entry in ws.logs.value" 
                                :key="entry.timestamp"
                                :entry="entry"
                            />
                        </tbody>
                    </table>
                    <p v-if="ws.logs.value.length === 0" class="text-muted text-center">No logs</p>
                </template>
            </template>
        </UTabs>
    </template>
    <template #footer>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { type ShareInfo } from '@srcpanel/common/Share';
import DownloadItem from './DownloadItem.vue';
import DownloadLog from './DownloadLog.vue';
import type { TabsItem } from '@nuxt/ui';

const props = defineProps<{
    ws: UseShareWSInstance
}>()

const tabs = computed<TabsItem[]>(() => {
    return [
        {
            label: `Items (${props.ws.items.value.size})`,
            value: "items"
        },
        {
            label: `Logs (${props.ws.logs.value.length})`,
            value: "logs"
        }
    ]
})

const tab = ref<string>(tabs.value[0]?.value as string)
</script>
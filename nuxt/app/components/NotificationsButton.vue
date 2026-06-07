<template>
    <UTooltip text="Notifications">
        <UButton :leading-icon="notifications.length > 0 ? 'lucide:bell-dot' : 'lucide:bell'" 
          color="secondary" variant="link" 
          class="text-white hover:text-white active:text-white/100 hover:bg-white/15 dark:hover:bg-black/15" 
          @click="showNotifications"
        >{{ notifications.length || '' }}</UButton>
    </UTooltip>
</template>

<script setup lang="ts">
import { useNotifications } from '~/composables/client/useNotifications.js';

const { notifications, clearNotifications } = useNotifications()
const { alert } = useModal()

async function showNotifications() {
    await alert({
        title: 'Notifications',
        body: notifications.value.length > 0
            ? h('div', { class: 'flex flex-col gap-2' }, notifications.value.map(n => h('p border', {}, n.message)))
            : h('p', { class: 'text-muted'}, 'You have no notifications'),
        okText: notifications.value.length > 0 ? 'Clear' : 'Close',
        okColor: notifications.value.length > 0 ? 'info' : 'neutral'
    })
    await clearNotifications()
}
</script>
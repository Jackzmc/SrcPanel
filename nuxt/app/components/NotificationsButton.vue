<template>
    <UTooltip text="Notifications">
        <UButton
:leading-icon="notifications.length > 0 ? 'lucide:bell-dot' : 'lucide:bell'" 
          color="secondary"
variant="link" 
          class=" active:text-white/80 hover:bg-white/15 dark:hover:bg-black/15"
          @click="showNotifications"
        >{{ notifications.length || '' }}</UButton>
    </UTooltip>
</template>

<script setup lang="ts">
  //        class="text-white hover:text-white active:text-white/80 hover:bg-white/15 dark:hover:bg-black/15" 
import { LazyModalsNotificationsModal } from '#components';
import { useNotifications } from '~/composables/client/useNotifications.js';

const { notifications, clearNotifications, subscribe } = useNotifications()

const overlay = useOverlay()
const NotificationModal = overlay.create(LazyModalsNotificationsModal)

async function showNotifications() {
    const instance = NotificationModal.open()
    await instance.result
    await clearNotifications()
}

onMounted(() => {
    subscribe()
})
</script>
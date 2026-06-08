<template>
  <UModal
    :close="{ onClick: () => emit('close', false) }"
    title="Notifications"
    aria-describedby="Notifications list modal"
  >
    <template #body>
        <p v-if="!hasNotifications" class="text-muted">You have no notifications</p>
        <div class="flex flex-col gap-2">
            <NotificationCard
                v-for="notification,i in notifications"
                :key="i"
                :notification="notification"
            />
        </div>
    </template>
    <template #footer>
      <div class="flex gap-2">
        <UButton 
            color="neutral"
            :label="okLabel" 
            @click="emit('close', false)"
        />
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { useNotifications } from '~/composables/client/useNotifications.js';
import NotificationCard from './NotificationCard.vue';

const { notifications } = useNotifications()

const hasNotifications = computed(() => notifications.value.length > 0)
const okLabel = computed(() => hasNotifications.value ? 'Clear' : 'Close')

const emit = defineEmits<{ close: [boolean] }>()
</script>

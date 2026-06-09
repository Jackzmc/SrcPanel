<template>
  <UCard>
    <div :class="['flex flex-row gap-2 items-start', data.textClass]">
      <UIcon :name="data.icon" class="size-6" />
      <div class="flex flex-col flex-wrap gap-4">
        <p class="text-md text-neutral">
          {{ notification.message }}
        </p>
        <UButton
          v-if="notification.link"
          :href="notification.link"
          :label="notification.link"
          size="sm"
        />
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import { type UserNotification } from "@jzpanel/common/User";
import { getLevelData } from "~/composables/client/useNotifications.js";

const props = defineProps<{
  notification: UserNotification;
}>();

const data = computed(() => getLevelData(props.notification.level));
</script>

<template>
  <UCard>
    <template #header>
      <h3 class="text-lg font-bold">Voice Members
        <UBadge variant="outline" color="neutral" class="ml-1">{{ voiceMembers?.length ?? 0 }}</UBadge>
      </h3>
      <!-- <p class="text-gray-100">In the </p> -->
    </template>
    <div v-if="voiceMembers?.length === 0">
      <p class="text-muted">No voice members are currently connected.</p>
    </div>
    <div v-else>
      <ul>
        <li v-for="member in voiceMembers" :key="member">
          <UserComponent :user="member" />
        </li>
      </ul>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import type { VoiceUser } from '@jzpanel/common/Server';
import UserComponent from '@/components/UserComponent.vue'

const props = defineProps<{
  serverId: string,
  voiceMembers?: VoiceUser[] | null
}>()
</script>

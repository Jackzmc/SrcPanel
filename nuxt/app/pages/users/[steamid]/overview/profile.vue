<template>
  <div class="grid grid-cols-3 gap-2">
    <div class="col-span-2 space-y-2">
      <UCard>
        <h3 class="text-lg font-semibold">Player Statistics</h3>
        <PlayerStats :steamid="props.steamid" />
      </UCard>
      <UCard>
        <h3 class="text-lg font-semibold">Logs</h3>
        <UBadge class="text-warning">Available in future updates</UBadge>
      </UCard>
    </div>
    <div class="space-y-2">
      <UCard class="bg-light-blue">
        <h3 class="text-lg font-semibold">Reputation</h3>
        <div>Neutral (-0.13)</div>
      </UCard>
      <UCard v-if="data.profile" class="bg-light-blue">
        <h2 class="text-xl font-bold mb-2">Profile</h2>
        <div class="px-2">
          <h3 class="text-lg font-semibold">Birth Day</h3>
          <div>{{ birthDate }}</div>
        </div>
      </UCard>
      <UCard v-else>
        <h2 class="text-xl font-semibold">Profile</h2>
        <div>No profile data available</div>
      </UCard>
      <div class="flex auto-cols-max grid-flow-col gap-2">
        <UButton variant="outline" color="neutral" target="_blank" :to="urls.stats" trailing-icon="lucide:square-arrow-out-up-right">Stats Profile</UButton>
        <UButton variant="outline" color="neutral" target="_blank" :to="urls.steam" trailing-icon="lucide:square-arrow-out-up-right">Steam Profile</UButton>
        <UButton variant="outline" color="neutral" target="_blank" :to="urls.logs" trailing-icon="lucide:square-arrow-out-up-right">View in Logs</UButton>
      </div>
      <div class="flex flex-cols gap-2 flex-wrap">
        <UButton class="w-full" variant="outline" color="neutral" leading-icon="lucide:rotate-cw">Update Steam Info</UButton>
        <UButton class="w-full impersonate" variant="outline" color="neutral" leading-icon="lucide:circle-user">Impersonate</UButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { APIUserDetails, UserNameEntry } from '@jzpanel/common/User'
import PlayerStats from '@/components/users/overview/PlayerStats.vue'
import SteamID from 'steamid';

const props = defineProps<{
  steamid: string
  data: APIUserDetails
}>()

const steamid = computed(() => new SteamID(props.steamid))

const urls = computed(() => {
  return {
    stats: `https://stats.jackz.me/users/${props.steamid}`,
    steam: `https://steamcommunity.com/profiles/${steamid.value.getSteamID64()}`,
    logs: `/admin/audit?client=${props.steamid}`
  }
})

const birthDate = computed(() => {
  if (!props.data) return null
  const profile = props.data.profile
  if(!profile) return null
  const date = new Date(2000, profile.birthMonth ?? 0, profile.birthDate)
  if(profile.birthMonth) {
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric'  })
  } else if(profile.birthDate) {
    return date.toLocaleDateString('en-US', { day: 'numeric' })
  }
  return null
})
</script>

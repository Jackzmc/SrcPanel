<template>
  <div>
    <Hero v-if="data" :title="title" :avatar="ids&&data ? { alt: data.user.name ?? ids?.steamid2, id: ids.steamid2 } : undefined">
      <template #subtitle>
        <div class="flex flex-wrap text-center justify-center items-center gap-4 pt-2">
          <UTooltip v-for="(value, type) in ids" :key="type" :text="type">
            <span>{{ value }}</span>
          </UTooltip>
        </div>
      </template>
    </Hero>
    <UContainer v-if="data&&ids">
      <UTabs class="mt-4"
        :items="tabs"
        :model-value="tabId"
        @update:model-value="tab => navigateTo(`/users/${ids!.steamid2}/${tab}`)"
      />
      <NuxtPage :steamids="ids" :steamid="ids.steamid2" :player-name="playerName" :data="data" />
      <UFooter>
        <p class="text-xs text-muted">Profile fetched in {{ data.meta.times.user }} ms</p>
      </UFooter>
    </UContainer>
    <UContainer v-else>
      <div class="my-6 mx-2 text-center">
        <UCard>
          <h2 class="text-lg font-bold">User not found</h2>
          <p class="py-2">No user found matching <b>{{ route.params.steamid }}</b></p>

          <div class="flex justify-center gap-2 pt-4">
            <UButton to="/admin/players/recent">Recent Players</UButton>
            <UButton to="/admin/players/search">Search Players</UButton>
            <UButton to="/admin/players/admins">Admins</UButton>
            <UButton to="/users/@me">My Profile</UButton>
          </div>
        </UCard>
      </div>
    </UContainer>
  </div>
</template>

<script setup lang="ts">
import { type APIUserDetails } from '@jzpanel/common/User'
import SteamID from 'steamid'

const route = useRoute()
const { requireAuth, user: myUser } = useAuth()
if(route.params.steamid === "@me") {
  if(myUser.value) await navigateTo(`/users/${myUser.value?.user.steamid}/overview`, { replace: true })
  else await requireAuth()
}

const ids = computed(() => {
  try {
    let id = route.params.steamid as string
    if(id === "@me" && myUser.value) id = myUser.value.user.steamid 
    const steamid = new SteamID(id)
    return {
      steamid3: steamid.getSteam3RenderedID(),
      steamid2: steamid.getSteam2RenderedID(),
      steamid64: steamid.getSteamID64(),
    }
  } catch(err) {
    return null
  }
})

const { data } = await useFetch<APIUserDetails>(() => `/api/users/${ids.value?.steamid2 ?? route.params.steamid}?include=admin,profile,names`, { key: `users.${ids.value?.steamid2 ?? route.params.steamid} `})
const title = computed(() => {
  return data.value?.user.name ?? ids.value?.steamid2 ?? "Invalid User"
})

const tabs = [
  {
    label: 'Overview',
    icon: 'i-lucide-info',
    value: 'overview',
  },
  {
    label: 'Privileges',
    icon: 'i-lucide-user-round-pen',
    value: 'privileges',
  },
  {
    label: 'Notes',
    icon: 'i-lucide-sticky-note',
    value: 'notes',
  },
  {
    label: 'Bans',
    icon: 'i-lucide-gavel',
    value: 'bans',
  }
]


const tabId = computed(() => route.meta.tab as string)
const tab = computed(() => tabs.find(tab => tab.value === tabId.value))
const playerName = computed(() => {
  return data.value?.user.name ?? data.value?.user.id ?? route.params.steamid
})

useHead({
  title: computed(() => {
    const name = tab.value?.label ?? 'Players'
    if(data.value && ids.value) {
      if(data.value.user.name) return `${name} - ${data.value.user.name} - ${ids.value.steamid2}`
      return `${name} - ${ids.value.steamid2}`
    }
    return name
  })
})
useSeoMeta({
  ogTitle: computed(() => {
    const name = tab.value?.label ?? 'Players'
    if(data.value && ids.value) {
      if(data.value.user.name) return `Player ${name} - ${data.value.user.name} - ${ids.value.steamid2}`
      return `Player ${name} - ${ids.value.steamid2}`
    }
    return name
  }),
  description: `Player info for ${playerName.value}`
})
</script>

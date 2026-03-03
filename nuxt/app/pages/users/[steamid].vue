<template>
  <div>
    <Hero v-if="data" :title="title" :subtitle="steamid" :avatar="{ alt: data.user.name ?? steamid, id: steamid }" />
    <UContainer v-if="data">
      <UTabs class="mt-4"
        :items="tabs"
        :model-value="tabId"
        @update:model-value="tab => navigateTo(`/users/${steamid}/${tab}`)"
      />
      <NuxtPage :steamid="steamid" :data="data" />
      <UFooter>
        <p class="text-xs text-muted">Profile fetched in {{ data.meta.times.user }} ms</p>
      </UFooter>
    </UContainer>
    <UContainer v-else>
      <div class="my-6 mx-2 text-center">
        <UCard>
          <h2 class="text-lg font-bold">User not found</h2>
          <p class="py-2">No user found matching <b>{{ steamid }}</b></p>

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
import { type APIUserDetails } from '@common/User'

const route = useRoute()
const { requireAuth, user: myUser } = useAuth()
const steamid = computed(() => route.params.steamid as string)
if(steamid.value === "@me" && myUser.value) navigateTo(`/users/${myUser.value?.user.steamid}/overview`)

const { data } = await useFetch<APIUserDetails>(() => `/api/users/${steamid.value}?include=admin,profile,names`, { key: `users.${steamid.value} `})

const title = computed(() => {
  return data.value?.user.name ?? steamid.value
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

useHead({
  title: computed(() => data.value ? `${data.value?.user.name} - ${steamid.value} - Players` : `${steamid.value} - Players`)
})
</script>

<template>
  <UPopover v-if="!hideTooltip" mode="hover" :open-delay="200">
    <ULink :to="id ? { path: `/users/${id}`, query: { returnTo: route.fullPath } } : undefined" class="flex items-center gap-1.5">
      <UAvatar v-if="!hideAvatar && clientAvatarSrc" :src="clientAvatarSrc" :alt="props.user.name" size="xs" />
      <span v-if="!hideName">{{ props.user.name ?? id }}</span>
    </ULink>

    <template #content>
      <div class="flex items-start gap-3 p-3 w-72">
        <UAvatar v-if="clientAvatarSrc" :src="clientAvatarSrc" :alt="props.user.name" size="md" />
        <div class="min-w-0 flex-1">
          <p class="font-bold text-highlighted text-lg">{{ props.user.name }}</p>
          <p class="text-md text-muted font-mono">{{ steamid2 ?? props.fallbackName ?? 'BOT' }}</p>
          <div v-if="id" class="flex flex-wrap gap-1 mt-2">
            <UBadge v-if="isAdmin" color="info" variant="subtle">Admin</UBadge>
            <UBadge v-if="'bansCount' in props.user && props.user.bansCount != null" color="error" variant="subtle">
              {{ props.user.bansCount }} Ban(s)
            </UBadge>
            <UBadge v-if="'notesCount' in props.user && props.user.notesCount != null" color="neutral" variant="subtle">
              {{ props.user.notesCount }} Note(s)
            </UBadge>
          </div>
        </div>
      </div>
    </template>
  </UPopover>

  <!-- No tooltip variant -->
  <ULink v-else :to="id ? { path: `/users/${id}`, query: { returnTo: route.fullPath } } : undefined" class="flex items-center gap-1.5">
    <UAvatar v-if="!hideAvatar && clientAvatarSrc" :src="clientAvatarSrc" :alt="props.user.name" size="xs" />
    <span v-if="!hideName">{{ props.user.name ?? id }}</span>
  </ULink>
</template>

<script setup lang="ts">
import SteamID from 'steamid'
import { type APIUser } from '@common/User.js'

const route = useRoute()

interface UserMeta {
  name?: string
  avatarUrl?: string
}

const props = defineProps<{
  user: APIUser | (UserMeta & ({ steamid: string | null | undefined } | { id: string }))
  isAdmin?: boolean
  hideAvatar?: boolean
  hideName?: boolean
  hideTooltip?: boolean
  fallbackName?: string
}>()

const id = computed(() => {
  if (!props.user) return null
  if ('steamid' in props.user) return props.user.steamid as string ?? null
  if ('id' in props.user) return props.user.id as string ?? null
  return null
})

const clientAvatarSrc = computed(() => {
  if (props.hideAvatar) return null
  return id.value ? `/api/users/${id.value}/avatar` : '/img/steam_default_avatar.png'
})

const steamid2 = computed(() => {
  if (!id.value) return null
  if (id.value.startsWith('STEAM_')) return id.value
  try {
    return new SteamID(id.value).getSteam2RenderedID()
  } catch {
    return null
  }
})
</script>

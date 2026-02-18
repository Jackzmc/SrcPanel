<template>
<div class="user-tooltip">
  <component :is="steamid2 ? 'router-link' : 'a'" class="media" :to="{name:'manage-user',params:{ id: steamid2 }, query: { returnTo: route.fullPath }}">
    <figure v-if="!hideAvatar && clientAvatarSrc" class="media-left mr-2">
      <p class="image is-32x32">
        <LazyImage alt="User's avatar" observer img-class="is-rounded" :src="clientAvatarSrc" placeholder-src="/img/steam_default_avatar.png" />
      </p>
    </figure>
    <div v-if="!hideName" class="media-content">
      <div class="content mt-1 pr-0">
        {{ props.user.name ?? id }}
      </div>
    </div>
  </component>
  <div class="user-tooltip-content" v-if="!hideTooltip">
    <figure v-if="clientAvatarSrc" class="image is-48x48 is-inline-block mr-3 is-round">
      <LazyImage alt="User's avatar" observer img-class="is-rounded" :src="clientAvatarSrc" placeholder-src="/img/steam_default_avatar.png" />
    </figure>
    <div class="is-inline-block mt-0">
      <p class="title is-5 has-text-primary mt-0">{{ props.user.name }}</p>
      <p v-if="steamid2" class="subtitle is-6 has-text-white">{{ steamid2 }}</p>
      <p v-else class="subtitle is-6 has-text-white">{{ props.fallbackName ?? "BOT" }}</p>
    </div>
    <template v-if="id">
      <br>
      <span class="tags">
        <span v-if="isAdmin" class="tag is-info">Admin</span>
        <span v-if="'bansCount' in props.user && props.user.bansCount != null" class="tag is-danger">{{ props.user.bansCount }} Ban(s)</span>
        <span v-if="'notesCount' in props.user && props.user.notesCount != null" class="tag">{{ props.user.notesCount }} Notes(s)</span>
      </span>
    </template>
  </div>
</div>
</template>

<script setup lang="ts">
import SteamID from 'steamid'
import { ref, computed } from 'vue'
import { APIUser } from '../../../common-types/User.js';
import LazyImage from '@/components/LazyImage.vue'
import { useRoute } from 'vue-router';

const route = useRoute()

export interface User {
  steamid: string,
  name: string,
  avatarUrl?: string,
  notesCount?: number
  bansCount?: number
}

interface UserMeta {
  name?: string,
  avatarUrl?: string
}
const props = defineProps<{
  user: APIUser | UserMeta & ({ steamid: string | null | undefined } | { id: string }),
  isAdmin?: boolean,
  hideAvatar?: boolean,
  hideName?: boolean
  hideTooltip?: boolean

  fallbackName?: string,
  forceAvatar?: boolean
}>()

const id = computed(() => {
  if('steamid' in props.user) return props.user.steamid as string
  else if('id' in props.user) return props.user.id as string
  return null
})

const clientAvatarSrc = computed(() => {
  if(props.hideAvatar) return
  // if(props.user.avatarUrl) return props.user.avatarUrl
  return (id.value)
    ? `/api/users/${id.value}/avatar`
    : "/img/steam_default_avatar.png"
})

const steamid2 = computed(() => {
  if(!id.value) return
  if(id.value.startsWith("STEAM_")) return id.value
  try {
    const steamid = new SteamID(id.value)
    return steamid.getSteam2RenderedID()
  } catch(err) {
    return null
  }
})

</script>

<style scoped>
/* div.tooltip-content {
  padding: 10px;
  color: #fff;
  width: 300px !important;
  z-index: 100;
  position: absolute;
  opacity: 100%;
} */
.media {
  width: max-content;
  margin-bottom: 0 !important;
}
.user-tooltip {
  position: relative;
  display: inline-block;
}
.user-tooltip .user-tooltip-content {
  /* display: hidden; */
  visibility: hidden;
  width: 120px;
  background-color: var(--bulma-dark);
  color: #fff;
  border-radius: 6px;
  padding: 10px;
  position: absolute;
  z-index: 1000;
  bottom: 125%;
  left: 50%;
  margin-left: -60px;
  opacity: 0;
  transition: opacity 0.2s;
  width: 300px !important;
}
.user-tooltip .user-tooltip-content::after {
  content: "";
  position: absolute;
  top: 100%;
  left: 50%;
  margin-left: -95px;
  border-width: 15px;
  border-style: solid;
  border-color: var(--bulma-dark) transparent transparent transparent;
}
.user-tooltip:hover .user-tooltip-content {
  /* display: inline-block; */
  visibility: visible;
  opacity: 1;
}
</style>

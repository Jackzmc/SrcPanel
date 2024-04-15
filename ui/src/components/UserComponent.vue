<template>
<div class="user-tooltip">
  <component :is="steamid2 ? 'router-link' : 'a'" class="media" :to="{name:'manage-user',params:{ id: steamid2 }, query: { returnTo: $route.fullPath }}">
    <figure class="media-left mr-2" v-if="!hideAvatar && props.user.avatarUrl">
      <p class="image is-32x32">
        <LazyImage img-class="is-rounded" :src="props.user.avatarUrl" placeholder-src="/img/steam_default_avatar.png" />
      </p>
    </figure>
    <div class="media-content">
      <div class="content mt-1 pr-0">
        {{ props.user.name ?? id }}
      </div>
    </div>
  </component>
  <div class="user-tooltip-content">
    <figure class="image is-48x48 is-inline-block mr-3 is-round">
      <img v-if="props.user.avatarUrl" :src="props.user.avatarUrl" />
      <img v-else src="/img/steam_default_avatar.png" >
    </figure>
    <div class="is-inline-block mt-0">
      <p class="title is-5 has-text-primary mt-0">{{ props.user.name }}</p>
      <p class="subtitle is-6 has-text-white" v-if="steamid2">{{ steamid2 }}</p>
      <p class="subtitle is-6 has-text-white" v-else>BOT</p>
    </div>
    <template v-if="id">
      <br>
      <span class="tags">
        <span class="tag is-info" v-if="isAdmin">Admin</span>
        <span class="tag is-danger" v-if="'bansCount' in props.user && props.user.bansCount != null">{{ props.user.bansCount }} Ban(s)</span>
        <span class="tag" v-if="'notesCount' in props.user && props.user.notesCount != null">{{ props.user.notesCount }}Notes(s)</span>
      </span>
    </template>
  </div>
</div>
</template>

<script setup lang="ts">
import SteamID from 'steamid'
import { ref, computed } from 'vue'
import { APIUser } from '../../../common-types/User';
import LazyImage from '@/components/LazyImage.vue'

export interface User {
  steamid: string,
  name: string,
  avatarUrl?: string,
  notesCount?: number
  bansCount?: number
}


const props = defineProps<{
  user: User | APIUser,
  isAdmin?: boolean,
  hideAvatar?: boolean
}>()

const id = computed(() => {
  if('steamid' in props.user) return props.user.steamid as string
  else if('id' in props.user) return props.user.id as string
  return null
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
  margin-bottom: 0;
}
.user-tooltip {
  position: relative;
  display: inline-block;
}
.user-tooltip .user-tooltip-content {
  visibility: hidden;
  width: 120px;
  background-color: var(--bulma-dark);
  color: #fff;
  border-radius: 6px;
  padding: 10px;
  position: absolute;
  z-index: 1;
  bottom: 125%;
  left: 50%;
  margin-left: -60px;
  opacity: 0;
  transition: opacity 0.3s;
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
  visibility: visible;
  opacity: 1;
}
</style>

<template>
<span @mouseleave="hovering = false">
  <a class="media" @click="active = !active" @mouseenter="hovering = true">
    <figure class="media-left">
      <p class="image is-32x32">
        <img class="is-rounded" :src="props.user.avatarUrl">
      </p>
    </figure>
    <div class="media-content">
      <div class="content mt-1 pr-0">
        {{ props.user.name }}
      </div>
    </div>
  </a>
  <div class="box has-background-dark custom-tooltip" v-if="hovering || active">
    <figure class="image is-48x48 is-inline-block mr-3 is-round" v-if="props.user.avatarUrl">
      <img class="is-rounded" :src="props.user.avatarUrl" style="height:48px;width:48px;">
    </figure>
    <div class="is-inline-block">
      <p class="title is-5 has-text-info">{{ props.user.name }}</p>
      <p class="subtitle is-6 has-text-white" v-if="steamid2">{{ steamid2 }}</p>
      <p class="subtitle is-6 has-text-white" v-else>BOT</p>
    </div>
    <template v-if="id">
      <br><br>
      <span class="tags">
        <span class="tag is-info" v-if="isAdmin">Admin</span>
        <span class="tag is-danger" v-if="'bansCount' in props.user && props.user.bansCount != null">{{ props.user.bansCount }} Ban(s)</span>
        <span class="tag" v-if="'notesCount' in props.user && props.user.notesCount != null">{{ props.user.notesCount }}Notes(s)</span>
      </span>
      <router-link v-if="steamid2" :to="{name:'manage-user',params:{ id: steamid2 }, query: { returnTo: $route.fullPath }}" class="button is-info is-fullwidth is-small">View Profile</router-link>
    </template>
  </div>
  <!-- <div class="custom-tooltip-hover box has-background-dark" v-if="!active">
    Click for more information
  </div> -->
</span>
</template>

<script setup lang="ts">
import SteamID from 'steamid'
import { ref, computed } from 'vue'
import { APIUser } from '../../../common-types/User';

export interface User {
  steamid: string,
  name: string,
  avatarUrl?: string,
  notesCount?: number
  bansCount?: number
}


const props = defineProps<{
  user: User | APIUser,
  isAdmin?: boolean
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

let hovering = ref(false)
let active = ref(false)

</script>

<style scoped>
div.custom-tooltip {
  margin-bottom:160px;
  padding: 10px;

  color: #fff;
  min-height: 50px;
  position: absolute;
  bottom:60%;         /*remove top and replace with bottom*/
  width: 300px !important;
  z-index: 100;
  display: block;
}
.media {
  width: max-content;
}
</style>

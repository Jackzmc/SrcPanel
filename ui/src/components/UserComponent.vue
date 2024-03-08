<template>
<span>
  <a class="has-text-weight-bold has-custom-tooltip" @click="active = !active">{{ props.user.name }}</a>
  <div :class="['custom-tooltip','box','has-background-dark',{'active': active}]" >
    <figure class="image is-48x48 is-inline-block mr-3 is-round" v-if="props.user.avatarUrl">
      <img class="is-rounded" :src="props.user.avatarUrl" style="height:48px;width:48px;">
    </figure>
    <div class="is-inline-block">
      <p class="title is-5 has-text-info">{{ props.user.name }}</p>
      <p class="subtitle is-6 has-text-white" v-if="props.user.steamid">{{ steamid2 }}</p>
      <p class="subtitle is-6 has-text-white" v-else>BOT</p>
    </div>
    <template v-if="props.user.steamid">
      <br><br>
      <span class="tags">
        <span class="tag is-info" v-if="isAdmin">Admin</span>
        <span class="tag is-danger" v-if="props.user.bansCount != null">{{ props.user.bansCount }} Ban(s)</span>
        <span class="tag" v-if="props.user.notesCount != null">{{ props.user.notesCount }}Notes(s)</span>
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

export interface User {
  steamid: string,
  name: string,
  avatarUrl?: string,
  notesCount?: number
  bansCount?: number
}


const props = defineProps<{
  user: User,
  isAdmin?: boolean
}>()

const steamid2 = computed(() => {
  if(props.user.steamid.startsWith("STEAM_")) return props.user.steamid
  try {
    const steamid = new SteamID(props.user.steamid)
    return steamid.getSteam2RenderedID()
  } catch(err) {
    return null
  }
})

let active = ref(false)

</script>

<style scoped>
/* a.has-custom-tooltip + a.custom-tooltip-hover {
  display: none;
}
a.has-custom-tooltip:hover  + a.custom-tooltip-hover{
  display: block;
  color: white;
} */
a.has-custom-tooltip + .custom-tooltip:not(.active)  {
  display: none;
}
a.has-custom-tooltip:hover + .custom-tooltip, .custom-tooltip:hover, .active  {
  padding: 20px;
  color: #fff;
  min-height: 50px;
  position: absolute;
  bottom:60%;         /*remove top and replace with bottom*/
  width: 300px;
  z-index: 100;
  display: block;
}
</style>

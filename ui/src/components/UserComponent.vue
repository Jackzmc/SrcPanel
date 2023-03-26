<template>
<span>
  <a class="has-text-weight-bold has-custom-tooltip" @click="active = !active">{{ props.user.name }}</a>
  <div :class="['custom-tooltip','box','has-background-dark',{'active': active}]" >
    <figure class="image is-48x48 is-inline-block mr-3">
      <img :src="props.user.avatarUrl">
    </figure>
    <div class="is-inline-block">
      <p class="title is-5 has-text-info">{{ props.user.name }}</p>
      <p class="subtitle is-6 has-text-white">{{ props.user.steamid }}</p>
    </div>
    <br><br>
    <span class="tags">
      <span class="tag is-info" v-if="isAdmin">Admin</span>
      <span class="tag is-danger">1 Ban(s)</span>
      <span class="tag">20 Notes(s)</span>
    </span>
    <router-link :to="{name:'manage-user',params:{ id:props.user.steamid }, query: { returnTo: $route.fullPath }}" class="button is-info is-fullwidth is-small">View Profile</router-link>
  </div>
  <!-- <div class="custom-tooltip-hover box has-background-dark" v-if="!active">
    Click for more information
  </div> -->
</span>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { UserData } from '../../../common-types/User.js';

export interface User {
  steamid: string,
  name: string,
  avatarUrl?: string,
}

let active = ref(false)

const props = defineProps<{
  user: User,
  isAdmin?: boolean
}>()
</script>

<style>
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

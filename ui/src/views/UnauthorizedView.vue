<template>
<div class="container has-text-centered">
  <div class="columns mt-6">
    <div class="column is-8">
      <div class="box">
        <h4 class="title is-3"><Icon icon="fa-lock">Login Required</Icon></h4>
        <p class="subtitle is-4">This page requires you to be logged in.</p>
        <hr>
        <p class="subtitle is-5">Login with either Steam or Discord (if linked) on the right to continue</p>
      </div>
    </div>
    <div v-if="meta" class="column">
      <div class="block"><SteamLoginButton size="large" :meta="meta" /></div>
      <div class="block" data-tooltip="Only if you have linked to a steam account"><DiscordLoginButton size="large" :meta="meta" /></div>
    </div>
  </div>
</div>
</template>

<script setup lang="ts">
import { PrivilegedUser } from '@/js/User';
import { ref, onBeforeMount, watch } from 'vue'
import { useRouter } from 'vue-router';
import DiscordLoginButton from '@/components/oauth/DiscordLoginButton.vue';
import SteamLoginButton from '@/components/oauth/SteamLoginButton.vue';
import { PanelMetaInfo } from '../../../common-types/Panel.js';

const router = useRouter()
const props = defineProps<{
  privUser?: PrivilegedUser,
  meta?: PanelMetaInfo
}>()


function onIsLoggedIn() {
  const params = new URLSearchParams(window.location.search);
  if(params.has('type')) type.value = Number(params.get('type'))
  if(props.privUser && type.value == 0) {
    const returnTo = params.get('return') || '/'
    console.info("User authenticated, redirecting back to page", returnTo)
    router.push(returnTo)
  }
}

let type = ref(0)

watch(() => props.privUser, onIsLoggedIn)
onBeforeMount(onIsLoggedIn)
</script>

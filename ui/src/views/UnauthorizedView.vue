<template>
<div class="container has-text-centered">
  <div class="columns mt-6">
    <div class="column is-8">
      <div class="box">
        <h4 class="title is-3"><Icon icon="fa-lock">Login Required</Icon></h4>
        <p class="subtitle is-4">This page requires you to be logged in.</p>
        <hr>
        <p class="subtitle is-5">Login with either Steam or Discord on the right to continue</p>
      </div>
    </div>
    <div class="column">
      <div class="block"><SteamLoginButton size="large" /></div>
      <div class="block"><DiscordLoginButton size="large" /></div>
    </div>
  </div>
</div>
</template>

<script setup lang="ts">
import { PrivilegedUser } from '@/js/User';
import { ref, onBeforeMount, watch } from 'vue'
import { useRouter } from 'vue-router';
import DiscordLoginButton from '@/components/DiscordLoginButton.vue';
import SteamLoginButton from '@/components/SteamLoginButton.vue';

const router = useRouter()
const props = defineProps<{
  privUser?: PrivilegedUser
}>()


function onIsLoggedIn() {
  const params = new URLSearchParams(window.location.search);
  if(params.has('type')) type.value = Number(params.get('type'))
  if(props.privUser && type.value == 0) {
    router.push(params.get('return') || '/')
  }
}

let type = ref(0)

watch(() => props.privUser, onIsLoggedIn)
onBeforeMount(onIsLoggedIn)
</script>

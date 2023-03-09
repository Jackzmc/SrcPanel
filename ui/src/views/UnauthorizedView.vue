<template>
<div class="container has-text-centered">
  <br><br><br>
  <h1 class="title is-1">Login required</h1>
  <p class="subtitle is-4">This page requires you to be logged in to access its contents</p>
  <p v-if="type == 0">please login with steam (top right) to view</p>
  <p v-if="type == 1">
    You are not a registered administrator
    </p>
</div>
</template>

<script setup lang="ts">
import { ref, onBeforeMount, watch } from 'vue'
import { useRouter } from 'vue-router';
import { SessionData } from '../../../common-types/User.js';

const router = useRouter()
const props = defineProps<{
  userdata: SessionData
}>()


function onIsLoggedIn() {
  const params = new URLSearchParams(window.location.search);
  if(params.has('type')) type.value = Number(params.get('type'))
  if(props.userdata && type.value == 0) {
    router.push(params.get('return') || '/')
  }
}

let type = ref(0)

watch(() => props.userdata, onIsLoggedIn)
onBeforeMount(onIsLoggedIn)
</script>

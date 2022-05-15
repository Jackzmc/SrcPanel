<template>
  <div id="app">
    <NavBar :userdata="userdata" @logout="onLogout" :update-info="updateInfo" />
    <br>
    <br v-if="$route.meta.hideHero">

    <section  v-else class="hero is-info has-text-centered">
      <div class="hero-body">
        <p class="title" >
          {{ $route.meta.title }}
        </p>
        <p class="subtitle">
          {{ $route.meta.description }}
        </p>
      </div>
    </section>


    <br>
    <router-view :userdata="userdata"></router-view>
    <footer class="footer">
      <div class="content has-text-centered">
        L4D2 Admin Dashboard - Updated {{lastUpdated}}
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { onBeforeMount, ref, inject, computed } from 'vue'
import NavBar from '@/components/NavBar.vue'
import { AdminPermissions, Session } from '../../common-types/User.js';
import { useRoute, useRouter } from 'vue-router';
import { SessionUser } from '../../common-types/User';

const LAST_UPDATED = new Date(Number(inject('LAST_UPDATED')))
const lastUpdated = computed(() => {
  return LAST_UPDATED.toLocaleString()
})

const route = useRoute()
const router = useRouter()

let updateInfo = ref<{
  registration?: any,
  updating: boolean
}>({updating: false})

interface UserData {
  user: SessionUser,
  permissions: AdminPermissions
}

let userdata = ref<UserData|null>()

function reloadPage() {
  if (!updateInfo.value.registration || !updateInfo.value.registration.waiting) return
  updateInfo.value.registration.waiting.postMessage({ type: 'SKIP_WAITING' })
  window.location.reload()
}
function updateAvailable(event: any) {
  updateInfo.value.registration = event.detail
  reloadPage()
}
async function getAuth() {
  const userData = window.sessionStorage.getItem('srcds_userdata')
  if(userData) {
    userdata.value = JSON.parse(userData)
  }

  const response = await fetch(`/api/auth/profile`, {
    credentials: 'include'
  })
  if(response.ok) {
    const json = await response.json()
    userdata.value = {
      user: json.user,
      permissions: json.permissions
    }
    window.sessionStorage.setItem('srcds_userdata', JSON.stringify(userdata.value))
    console.log('Authorized: Hello', json.user.name)
  } else {
    window.sessionStorage.removeItem('srcds_userdata')
    if(route.meta.authRequired && !userdata) {
      router.push('/login-required?return=' + route.fullPath)
    }
  }
}

function onLogout() {
  userdata.value = undefined
}

onBeforeMount(async() => {
  document.addEventListener('swUpdated', updateAvailable, { once: true })
  document.addEventListener('swUpdating', () => updateInfo.value.updating = true, { once: true })
  await getAuth()
})
</script>

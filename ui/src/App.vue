<template>
  <div id="app">
    <Notifications position="top center" :duration=5000 />
    <NavBar v-if="!$route.meta.hideNav" :userdata="userdata" @logout="onLogout" :update-info="updateInfo" />
    <br>
    <br v-if="$route.meta.hideHero">

    <section v-else class="hero is-info has-text-centered">
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
import { onBeforeMount, ref, computed } from 'vue'
import NavBar from '@/components/NavBar.vue'
import { useRoute, useRouter } from 'vue-router';
import { UserData } from '@/js/User.js'
import { notify } from '@kyvg/vue3-notification';



const LAST_UPDATED = new Date(Number(process.env.VUE_APP_BUILD_DATE))
const lastUpdated = computed(() => {
  return LAST_UPDATED.toLocaleString()
})

const route = useRoute()
const router = useRouter()

let updateInfo = ref<{
  registration?: any,
  updating: boolean
}>({updating: false})

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
      permissions: json.permissions,
      privileges: json.privileges
    }
    window.sessionStorage.setItem('srcds_userdata', JSON.stringify(userdata.value))
    console.log('Authorized: Hello', json.user.name)
  } else if(response.status == 401) {
    window.sessionStorage.removeItem('srcds_userdata')
    if(route.meta.authRequired && !userdata) {
      router.push({
        name: 'authrequired',
        query: {
          return: route.fullPath
        }
      })
    }
  } else {
    const body = await response.text()
    console.error(`Error while authenticating with server: ${body}`)
    notify({
      type: 'error',
      title: 'Could not authenticate with server:',
      duration: 10000,
      text: response.statusText
    })
    if(route.meta.authRequired) {
      router.push({
        name: 'errorview',
        query: {
          return: route.fullPath,
          error: response.statusText
        }
      })
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

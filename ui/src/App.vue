<template>
  <div id="app">
    <Notifications position="top center" :duration=7000 />
    <NavBar v-if="!$route.meta.hideNav" :userdata="userdata" @logout="onLogout" :update-info="updateInfo" :priv-user="privUser" />
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
    <router-view :userdata="userdata" :priv-user="privUser"></router-view>

    <footer class="footer">
      <div class="content has-text-centered">
        L4D2 Admin Dashboard - Updated {{lastUpdated}}
      </div>
    </footer>
    <!-- <div style="background-color: #fafafa !important">
    <router-view :userdata="userdata"></router-view>
    </div>

    <footer class="footer">

    </footer> -->
  </div>
</template>

<script setup lang="ts">
import { onBeforeMount, ref, computed } from 'vue'
import NavBar from '@/components/NavBar.vue'
import { useRoute, useRouter } from 'vue-router';
import { PrivilegedUser} from '@/js/User'
import { notify } from '@kyvg/vue3-notification';
import { ClientUserData } from '../../common-types/User';



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

let userdata = ref<ClientUserData>()
let privUser = ref()

function reloadPage() {
  if (!updateInfo.value.registration || !updateInfo.value.registration.waiting) return console.warn("reloadPage() called when no sw update")
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
    if(userdata.value) {
      privUser.value = new PrivilegedUser(userdata.value)
      console.debug('using cached user data')
      return
    }
  }

  const response = await fetch(`/api/auth/profile`, {
    credentials: 'include'
  })
  if(response.ok) {
    const json = await response.json()
    console.log('new data', json.permissions, json.codes instanceof Set)
    userdata.value = json as ClientUserData
    privUser.value = new PrivilegedUser(userdata.value)
    window.sessionStorage.setItem('srcds_userdata', JSON.stringify(userdata.value))
    if(json.isSessionOld) { //
      notify({
        type: "warn",
        text: "Your session has expired, please login again.",
      })

    }
    console.log('Authorized: Hello', json.user.name)
  } else if(response.status === 401 || response.status === 403) {
    userdata.value = undefined
    if(window.sessionStorage['srcds_userdata']) {
      notify({
        type: "error",
        text: "Your session has expired"
      })
    }
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
  console.debug('user is logging out')
  window.sessionStorage.removeItem('srcds_userdata')
  userdata.value = undefined
  privUser.value = undefined
}

onBeforeMount(async() => {
  document.addEventListener('swUpdated', updateAvailable, { once: true })
  document.addEventListener('swUpdating', () => updateInfo.value.updating = true, { once: true })
  await getAuth()
})
</script>

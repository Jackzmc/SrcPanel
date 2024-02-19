<template>
  <div id="app">
    <!-- <v-tour v-if="tour" :name="tour.name" :steps="tour.steps"></v-tour> -->
    <Notifications position="top center" :duration=7000 @start="onNotificationShown" />
    <NavBar v-if="!$route.meta.hideNav" @logout="onLogout" :update-info="updateInfo" :priv-user="privUser" @notifications:clear="clearNotifications" />
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
    <router-view :priv-user="privUser"></router-view>
    <br>
    <footer class="footer">
      <div class="content has-text-centered">
        L4D2 Admin Dashboard - Updated {{lastUpdated}}
      </div>
    </footer>
    <div class="impersonate-overlay" v-if="privUser?.isImpersonating">
      <nav class="level">
        <div class="level-left">
          <div class="level-item">
            <p>
              Impersonating as <router-link class="has-text-white" :to="{ name: 'manage-user', params: { id: privUser.id }}">
                <b>{{privUser.name}}</b>
              </router-link>
            </p>
          </div>
        </div>
        <div class="level-right">
          <div class="level-item">
            <a class="button" @click="stopImpersonating">
              Stop Impersonating
            </a>
          </div>
        </div>
      </nav>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeMount, ref, computed } from 'vue'
import NavBar from '@/components/NavBar.vue'
import { useRoute, useRouter } from 'vue-router';
import { PrivilegedUser} from '@/js/User'
import { NotificationItem, notify } from '@kyvg/vue3-notification';
import { ClientUserData } from '../../common-types/User';
import * as Sentry from "@sentry/vue";
import { request } from './js/util.js';

const LAST_UPDATED = new Date(Number(BUILD_TIMESTAMP))
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
let privUser = ref<PrivilegedUser>()
let tour = ref<{name: string, steps: any[]}|undefined>()

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
  // We fetch cache to populate user name / icon
  const userData = window.sessionStorage.getItem('srcds_userdata')
  if(userData) {
    userdata.value = JSON.parse(userData)
    if(userdata.value) {
      privUser.value = new PrivilegedUser(userdata.value)
      console.debug('using cached user data')
    }
  }
  // Fetch profile even if cached, to verify its valid and to get notifications
  const response = await fetch(`/api/auth/profile`, {
    credentials: 'include'
  })
  if(response.ok) {
    const json = await response.json()
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
    let error
    if(response.headers.get("content-type")?.includes("application/json")) {
      const json = await response.json()
      console.error(`Error while authenticating with server:`, json)
      error = json.message ?? json.error
    } else {
      error = response.status + " " + response.statusText
    }
    notify({
      type: 'error',
      title: 'Could not authenticate with server:',
      duration: 10000,
      text: error
    })
    if(route.meta.authRequired) {
      router.push({
        name: 'errorview',
        query: {
          return: route.fullPath,
          error: error
        }
      })
    }
  }
}

async function clearNotifications() {
  await privUser.value?.clearNotifications()
  userdata.value!.notifications = []
  // Update local cache:
  window.sessionStorage.setItem('srcds_userdata', JSON.stringify(userdata.value))
}

function onNotificationShown(item: NotificationItem) {
  if(item.type === 'error') {
    Sentry.captureEvent({
      message: item.title ? `${item.title}:\n${item.text}` : item.text,
      user: {
        id: privUser.value?.id,
        name: privUser.value?.name,
      },
      level: 'error',
      tags: {
        notification: true,
      },
    })
  }
}

function onLogout() {
  console.debug('user is logging out')
  window.sessionStorage.removeItem('srcds_userdata')
  userdata.value = undefined
  privUser.value = undefined
}

async function loadTour(tourId: string) {
  const response = await request(`/tutorials/tours/${tourId}.json`)
  if(response?.ok) {
    const json = await response.json()
    tour.value = json
  }
}

async function stopImpersonating() {
  const response = await request(`/api/admin/impersonate/`, {
    method: 'POST',
    credentials: 'include'
  }, { title: "Impersonation Failed"})
  if(response?.ok) {
    const json = await response.json()
    userdata.value!.impersonating = false
    userdata.value!.user = json.user
    userdata.value!.permissions = json.permissions
    notify({
      type: "success",
      text: `Stoped impersonating`
    })
  }
}

onBeforeMount(async() => {
  document.addEventListener('swUpdated', updateAvailable, { once: true })
  document.addEventListener('swUpdating', () => updateInfo.value.updating = true, { once: true })
  await getAuth()
  if(route.query.tour) {
    loadTour(route.query.tour as string)
  }
})
</script>

<style>
.impersonate-overlay {
  position: fixed;
  bottom: 0;
  background-color: #c42dbf;
  padding: 1.25rem;
  width: 100%;
  color: white;
}
</style>

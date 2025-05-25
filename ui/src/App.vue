<template>
<div>
  <div id="app">
    <!-- <v-tour v-if="tour" :name="tour.name" :steps="tour.steps"></v-tour> -->
    <BirthdayComponent v-if="isBirthday" @close="closeBirthday" />
    <Notifications position="top center" :duration=7000 @start="onNotificationShown" />
    <NavBar v-if="!route.meta.hideNav" @logout="onLogout" :update-info="updateInfo" :priv-user="privUser" :meta="meta" />
    <br v-if="!route.meta.hideNav">
    <br v-if="route.meta.hideHero">
    <section v-else class="hero is-info has-text-centered">
      <div class="hero-body pb-5">
        <router-link v-if="prevRoute" :to="{ name: prevRoute }" class="is-pulled-left is-light is-rounded button" ><Icon icon="fa-chevron-left">Back</Icon></router-link>
        <p class="title has-text-white" >
          {{ route.meta.title }}
        </p>
        <p class="subtitle has-text-white">
          {{ route.meta.description }}
        </p>
        <router-link v-if="nextRoute" :to="{ name: nextRoute }" class="is-pulled-left is-light is-rounded button" ><Icon icon="fa-chevron-left">Next</Icon></router-link>
      </div>
    </section>

    <!-- <br> -->
    <router-view v-slot="{ Component }" class="mt-4">
      <keep-alive  :max="2">
        <component :is="Component" :priv-user="privUser" :meta="meta" class="px-2" />
      </keep-alive>
    </router-view>
    <br>
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
  <footer class="footer custom-footer">
    <div class="content has-text-centered">
      L4D2 Admin Dashboard - Updated {{lastUpdated}}
    </div>
  </footer>
</div>
</template>

<script setup lang="ts">
import { onBeforeMount, ref, computed, defineAsyncComponent, markRaw, shallowRef } from 'vue';
import NavBar from '@/components/NavBar.vue'
import { useRoute, useRouter } from 'vue-router';
import { PrivilegedUser} from '@/js/User'
import { NotificationItem, notify } from '@kyvg/vue3-notification';
import { ClientUserData } from '../../common-types/User';
import * as Sentry from "@sentry/vue";
import { request } from './js/util.js';
import { PanelMetaInfo } from '../../common-types/Panel.js';

const BirthdayComponent = defineAsyncComponent(() => import("@/components/BirthdayComponent.vue"))

const LAST_UPDATED = new Date(Number(BUILD_TIMESTAMP))
const lastUpdated = computed(() => {
  return LAST_UPDATED.toLocaleString()
})

const route = useRoute()
const router = useRouter()

const prevRoute = computed(() => {
  if(typeof route.meta.prevRoute === 'function') return route.meta.prevRoute(route)
  return route.meta.prevRoute
})
const nextRoute = computed(() => {
  if(typeof route.meta.nextRoute === 'function') return route.meta.nextRoute(route)
  return route.meta.nextRoute
})

let updateInfo = ref<{
  registration?: any,
  updating: boolean
}>({updating: false})

let userdata = ref<ClientUserData>()
let privUser = shallowRef<PrivilegedUser>()
let meta = ref<PanelMetaInfo>()
let isBirthday = ref(false)
let tour = ref<{name: string, steps: any[]}|undefined>()
let notificationSSE: EventSource|null = null

function reloadPage() {
  if (!updateInfo.value.registration || !updateInfo.value.registration.waiting) return console.warn("reloadPage() called when no sw update")
  updateInfo.value.registration.waiting.postMessage({ type: 'SKIP_WAITING' })
  window.location.reload()
}
function updateAvailable(event: any) {
  updateInfo.value.registration = event.detail
  reloadPage()
}
async function onAuthorized() {
  if(!userdata.value) return
  if(isModalAllowed("birthday")) {
    const date = new Date()
    if(userdata.value.profile && userdata.value.profile.birthMonth === date.getMonth() && userdata.value.profile.birthDate === date.getDate()) {
      isBirthday.value = true
    }
  }
  if(notificationSSE == null)
    setupNotificationStream()

}
async function getMeta() {
  if(window.localStorage['srcds_meta_cache']) {
    try {
      const json = JSON.parse(window.localStorage['srcds_meta_cache'])
      meta.value = json.data
    } catch(err) {
      console.error("getMeta:", err)
    }
  }

  const response = await fetch('/api/meta')
  if(response.ok) {
    const json = await response.json()
    window.localStorage['srcds_meta_cache'] = JSON.stringify({
      data: json,
      timestamp: Date.now()
    })
    meta.value = json
  }
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
    } else {
      await onAuthorized()
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
    let error, code
    if(response.headers.get("content-type")?.includes("application/json")) {
      const json = await response.json()
      code = json.code ?? json.error
      console.error(`Error while authenticating with server:`, json)
      error = json.message ?? json.error
    } else {
      code = response.status
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
          error: error,
          code: code
        }
      })
    }
  }
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

const dismissedModals = computed({
  get() {
    return localStorage['srcds_dismissed'] ? JSON.parse(localStorage['srcds_dismissed']) : {}
  },
  set(value) {
    localStorage['srcds_dismissed'] = JSON.stringify(value)
  }
})

function closeBirthday() {
  const modals = dismissedModals.value
  modals['birthday'] = Date.now() + (1000 * 60 * 60 * 24)
  dismissedModals.value = modals
  isBirthday.value = false
}

function onLogout() {
  console.debug('user is logging out')
  window.sessionStorage.removeItem('srcds_userdata')
  userdata.value = undefined
  privUser.value = undefined
  if(notificationSSE) {
    notificationSSE.close()
    notificationSSE = null
  }
}

async function loadTour(tourId: string) {
  const response = await request(`/tutorials/tours/${tourId}.json`)
  if(response?.ok) {
    const json = await response.json()
    tour.value = json
  }
}

async function stopImpersonating() {
  const response = await request(`/api/admins/impersonate/`, {
    method: 'POST',
    credentials: 'include'
  }, { title: "Impersonation Failed"})
  if(response?.ok) {
    const json = await response.json()
    userdata.value!.impersonatingId = undefined
    userdata.value!.user = json.user
    userdata.value!.permissions = json.permissions
    notify({
      type: "success",
      text: `Stoped impersonating`
    })
  }
}

function isModalAllowed(name: string) {
  const modals = dismissedModals.value
  if(modals[name]) {
    if(modals[name] < Date.now()) {
      delete modals[name]
      dismissedModals.value = modals
    }
    return false
  }
  return true
}

function setupNotificationStream(errorCount: number = 0) {
  const eve = new EventSource("/api/auth/notifications/sse")
  notificationSSE = eve
  eve.onmessage = (e) => {
    console.log("message")
    const json = JSON.parse(e.data)
    userdata.value?.notifications.push(json)
    errorCount = 0
  }
  eve.onerror = (e) => {
    errorCount++
    const nextTime = 1000 * Math.pow(2, errorCount )
    console.error("notification error, reconncting", nextTime)
    setTimeout(() => {
      eve.close()
      setupNotificationStream(errorCount)
    }, nextTime)
  }
}

onBeforeMount(async() => {
  document.addEventListener('swUpdated', updateAvailable, { once: true })
  document.addEventListener('swUpdating', () => updateInfo.value.updating = true, { once: true })
  await getAuth()
  if(route.query.tour) {
    loadTour(route.query.tour as string)
  }
  await getMeta()
})
</script>
<style src="./node_modules/bulma-list/css/bulma-list.css"></style>
<style>
.impersonate-overlay {
  position: fixed;
  bottom: 0;
  background-color: #c42dbf;
  padding: 1.25rem;
  width: 100%;
  color: white;
}
.custom-footer {
  position: absolute;
  bottom: 0;
  width: 100%;
  height: 4rem;
  padding: 1rem;
}
body {
  min-height: 100vh;
}
#app {
  position: relative;
  padding-bottom: 4rem;
}
</style>


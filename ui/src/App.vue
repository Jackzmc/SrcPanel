<template>
<div>
  <div>
    <!-- <v-tour v-if="tour" :name="tour.name" :steps="tour.steps"></v-tour> -->
    <BirthdayComponent v-if="isBirthday" @close="closeBirthday" />
    <Notifications position="top center" :duration=7000 @start="onNotificationShown" @click="(event: any) => event.data?.click()" />

    <NavBar v-if="!route.meta.hideNav" @toggle-theme="onToggleTheme" @logout="onLogout" :theme="activeTheme" :priv-user="privUser" :meta="meta" :hide-login="readyState != ReadyState.Show" />

    <br v-if="!route.meta.hideNav">
    <br v-if="route.meta.hideHero">

    <section v-else class="hero is-info has-text-centered" v-show="readyState == ReadyState.Show">
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
    <router-view v-slot="{ Component }" class="mt-4" v-if="readyState == ReadyState.Show">
      <keep-alive  :max="2">
        <component :is="Component" :priv-user="privUser" :meta="meta" class="px-2" />
      </keep-alive>
    </router-view>
    <div v-else-if="readyState === ReadyState.NeedsAuth" class="mt-1">
     <NotLoggedInComponent :meta="meta" />
    </div>
    <div v-else-if="readyState === ReadyState.WaitingForAuth" class="mt-6 has-text-centered">
     <p>Retrieving session data from server...</p>
    </div>

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
      {{ SITE_TITLE }} - Updated {{lastUpdatedText}}
    </div>
  </footer>
</div>
</template>

<script setup lang="ts">
import { onBeforeMount, ref, computed, defineAsyncComponent, markRaw, shallowRef, onMounted } from 'vue';
import NavBar from '@/components/NavBar.vue'
import { useRoute, useRouter } from 'vue-router';
import { PrivilegedUser} from '@/js/User'
import { NotificationItem, notify } from '@kyvg/vue3-notification';
import { ClientUserData } from '../../common-types/User';
import * as Sentry from "@sentry/vue";
import { request } from './js/util.js';
import { PanelMetaInfo } from '../../common-types/Panel.js';
import NotLoggedInComponent from './components/NotLoggedInComponent.vue';

const BirthdayComponent = defineAsyncComponent(() => import("@/components/BirthdayComponent.vue"))

const LAST_UPDATED = new Date(Number(BUILD_TIMESTAMP))
const SITE_TITLE = import.meta.env.VITE_SITE_TITLE
const lastUpdatedText = computed(() => {
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

enum ReadyState {
  None,
  WaitingForAuth,
  NeedsAuth,
  Show
}

let userdata = ref<ClientUserData>()
let privUser = shallowRef<PrivilegedUser>()
let meta = ref<PanelMetaInfo>()
let isBirthday = ref(false)
let tour = ref<{name: string, steps: any[]}|undefined>()
let notificationSSE: EventSource|null = null
let activeTheme = ref<string>("light")

let readyState = ref<ReadyState>(ReadyState.None)

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
  window.sessionStorage.removeItem('srcds_userdata')
  const response = await fetch(`/api/auth/profile`, {
    credentials: 'include'
  })
  if(response.ok) {
    // Successfully authenticated
    const json: ClientUserData = await response.json()
    userdata.value = json
    privUser.value = new PrivilegedUser(userdata.value)
    readyState.value = ReadyState.Show
    // window.sessionStorage.setItem('srcds_userdata', JSON.stringify(userdata.value))
    console.log('Authenticated as', json.user.name, json.user.accountid)
    await onAuthorized()
  } else if(response.status === 401 || response.status === 403) {
    // session is invalid or expired, or not logged in
    userdata.value = undefined
    privUser.value = undefined
    // If needs auth, then show login part
    // If auth not required, we are good
    readyState.value = readyState.value == ReadyState.WaitingForAuth ? ReadyState.NeedsAuth : ReadyState.Show
  } else {
    // request failed
    readyState.value = readyState.value == ReadyState.WaitingForAuth ? ReadyState.NeedsAuth : ReadyState.Show
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
  window.location.reload() // hacky
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

function applyTheme() {
  let preferredTheme = window.localStorage.getItem("srcds-theme")
  if(!preferredTheme) {
    preferredTheme = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)
      ? "dark"
      : "light"
  }
  console.debug("applying theme", preferredTheme)

  activeTheme.value = preferredTheme
  document.documentElement.setAttribute("data-theme", preferredTheme);
}

function onToggleTheme() {
  const newTheme = (activeTheme.value === "dark") ? "light" : "dark"
  activeTheme.value = newTheme

  document.documentElement.setAttribute("data-theme", newTheme);
  window.localStorage.setItem("srcds-theme", newTheme)
}

onBeforeMount(async() => {
  applyTheme()
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
    applyTheme()
  });

  await Promise.allSettled([
    await getMeta(),
    await getAuth()
  ])
  if(route.query.tour) {
    loadTour(route.query.tour as string)
  }
})
onMounted(async() => {
  await router.isReady()
  // Check if route once available requires auth, if not, then we can show the UI
  // If it does, then set it into waiting for auth state
  // At any time, getAuth() from earlier can return, even before this, doesn't matter.
  if(readyState.value == ReadyState.None) {
    readyState.value = route.meta.authRequired ? ReadyState.WaitingForAuth : ReadyState.Show
    console.debug("readyState set to", ReadyState[readyState.value])
  }
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


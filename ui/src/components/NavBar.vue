<template>
<div>
  <template v-if="privUser">
    <UserSettingsModal v-if="showModal === 'settings'" :priv-user="privUser" @close="showModal = undefined" />
    <NotificationsModal v-else-if="showModal === 'notifications'" :priv-user="privUser" @close="clearNotifications" />
  </template>
  <nav class="navbar is-fixed-top" role="navigation" aria-label="main navigation">
    <div class="navbar-brand">
      <div class="navbar-item is-hidden is-flex-touch">
        <b>Admin Panel</b>
      </div>
      <a role="button" :class="['navbar-burger',{'is-active': active}]" aria-label="menu" aria-expanded="false" @click="active = !active">
        <span aria-hidden="true"></span>
        <span aria-hidden="true"></span>
        <span aria-hidden="true"></span>
      </a>
    </div>

    <div :class="['navbar-menu',{'is-active': active}]">
      <div class="navbar-start">
        <router-link to='/' class="navbar-item" tag="a">
          Overview
        </router-link>
        <div class="navbar-item has-dropdown is-hoverable" >
          <a class="navbar-link">
            <Icon icon="info-circle">Documentation</Icon>
          </a>
          <div class="navbar-dropdown is-left">
            <router-link to="/docs/commands" class="navbar-item">
              <Icon icon="fa-regular fa-circle">Commands</Icon>
            </router-link>
            <router-link to="/docs/cvars" class="navbar-item">
              <Icon icon="wrench">Cvars</Icon>
            </router-link>
            <hr class="navbar-divider">
            <router-link to="/docs/ftt" class="navbar-item">
              Feed The Trolls
            </router-link>
            <router-link to="/docs/targetting" class="navbar-item">
              Player Targetting
            </router-link>
            <router-link to="/docs/extraplayers" class="navbar-item">
              5+ Player
            </router-link>
            <router-link to="/docs/notes" class="navbar-item">
              Player Notes
            </router-link>
            <router-link to="/docs/props" class="navbar-item">
              Prop Spawner
            </router-link>
            <router-link to="/docs/rules" class="navbar-item">
              Rules & Procedures
            </router-link>
            <hr class="navbar-divider">
            <router-link to="/docs/keybinds" class="navbar-item">
              <Icon icon="keyboard">Keybinds</Icon>
            </router-link>
            <router-link to="/docs/tutorials" class="navbar-item">
              <Icon icon="circle-question">Tutorials</Icon>
            </router-link>
          </div>
        </div>
        <div class="navbar-item has-dropdown is-hoverable" v-if="privUser">
          <a class="navbar-link">
            <Icon icon="toolbox">Administration</Icon>
          </a>
          <div class="navbar-dropdown is-left" style="width:110%">
            <router-link :to="{name: 'admin-shares'}" class="navbar-item">
              <Icon icon="fa-puzzle-piece">Addons / Maps</Icon>
            </router-link>
            <router-link to="/admin/servers" class="navbar-item">
              <Icon icon="fa-server">Servers</Icon>
            </router-link>
            <router-link to="/admin/audit" class="navbar-item">
              <Icon icon="list">Activity Log</Icon>
            </router-link>
            <router-link to="/admin/players" class="navbar-item">
              <Icon icon="users-gear">Manage Players</Icon>
            </router-link>
            <router-link to="/bans" class="navbar-item">
              <Icon icon="fa-gavel">Bans</Icon>
            </router-link>
            <hr class="navbar-divider">
            <div class="navbar-item">
              <a href="/api/admins/discord" class="button" style="background-color: #5865F2; color: white;">
                <span class="icon">
                  <FontAwesomeIcon icon="fab fa-discord" />
                </span>
                <span>Join the Discord</span>
              </a>
            </div>
          </div>
        </div>
        <router-link to="/notes" class="navbar-item">
          <Icon icon="fa-note-sticky">Player Notes</Icon>
        </router-link>
        <router-link to="/discuss" class="navbar-item">
          <Icon icon="far fa-comment">Discuss
            <span v-if="privUser && privUser.openDiscussionCount > 0" class="tag is-rounded is-info">{{privUser.openDiscussionCount}}</span>
          </Icon>
        </router-link>
        <router-link to="/events" class="navbar-item">
          <Icon icon="fa fa-calendar">Events
            <!-- <span v-if="privUser && privUser.openEventsCount > 0" class="tag is-rounded is-info">{{privUser.openEventsCount}}</span> -->
          </Icon>
        </router-link>
        <a href="https://data.jackz.me/dashboard/1-public-dashboard" class="navbar-item">
          <Icon icon="fa-chart-simple">Graphs</Icon>
        </a>
      </div>
      <div class="navbar-end">
        <div class="navbar-item" v-if="updateInfo.updating">
          <Icon icon="fa-solid fa-spinner" spin>
            <span class="ml-2">Updating UI...</span>
          </Icon>
        </div>
        <div class="navbar-item has-tooltip-bottom" :data-tooltip="darkMode ? 'Turn dark mode off' : 'Turn dark mode on'">
          <a class="button" @click="toggleTheme">
            <Icon :icon="themeIcon"></Icon>
          </a>
        </div>
        <template v-if="privUser">
          <a :class="['navbar-item',{loading: notificationsClearing }]" v-if="privUser.notifications.length > 0" @click="showModal = 'notifications'">
            <Icon icon="bell">{{ privUser.notifications.length }}</Icon>
          </a>
          <div class="navbar-item has-dropdown is-hoverable " >
            <a class="navbar-link">
              <img class="mx-2" :src="avatarUrl" />
              <span>{{privUser.name}}</span>
            </a>
            <div class="navbar-dropdown is-right" style="width:140%">
              <router-link class="navbar-item" :to="{ name: 'manage-user', params: { id: privUser.id }, query: { returnTo: $route.fullPath }}">
                <Icon icon="fa-user" text="Profile" />
              </router-link>
              <a class="navbar-item" @click="showModal = 'settings'">
                <Icon icon="fa-gear" text="User Settings" />
              </a>
              <router-link class="navbar-item" to="/panel/dashboard" v-if="privUser!.hasPermission('panel.view')">
                <Icon icon="fa-sitemap" text="Panel Administration" />
              </router-link>
              <hr class="navbar-divider">
              <p class="navbar-item" v-if="privUser.isSessionOld">
                <span class="tag is-warning">
                  <Icon icon="fa-exclamation-triangle" icon-class="mr-2" />
                  Outdated session, please relogin
                </span>
              </p>
              <a class="navbar-item has-text-danger" @click="logout">
                <Icon icon="fa-arrow-right-from-bracket">Logout</Icon>
              </a>
            </div>
          </div>
        </template>
        <template v-else-if="meta">
          <div class="navbar-item">
            <DiscordLoginButton :meta="meta" />
          </div>
          <div class="navbar-item">
            <SteamLoginButton :meta="meta" />
          </div>
        </template>
      </div>
    </div>
  </nav>
</div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onBeforeMount, watch } from 'vue';
import SteamLoginButton from '@/components/oauth/SteamLoginButton.vue'
import DiscordLoginButton from '@/components/oauth/DiscordLoginButton.vue'
import { useRoute, useRouter } from 'vue-router';
import { notify } from '@kyvg/vue3-notification';
import { PrivilegedUser } from '@/js/User';
import UserSettingsModal from './modals/UserSettingsModal.vue';
import NotificationsModal from './modals/NotificationsModal.vue'
import { PanelMetaInfo } from '../../../common-types/Panel.js';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
let darkMode = ref(false)
let active = ref(false)

const router = useRouter()
const route = useRoute()
const emit = defineEmits(['logout', 'notifications:clear'])

watch(() => route.fullPath, () => {
  active.value = false
})

const LAST_UPDATED = new Date(Number(BUILD_TIMESTAMP))

const props = defineProps<{
  privUser?: PrivilegedUser,
  updateInfo: any,
  meta?: PanelMetaInfo
}>()

let showModal = ref<string>()
let notificationsClearing = ref<boolean>()

const avatarUrl = computed(() => {
  return props.privUser ? props.privUser.avatarUrl : ""
})

const updateTooltip = computed(() => {
  return `${LAST_UPDATED.toLocaleDateString()} at ${LAST_UPDATED.toLocaleTimeString()}`
})
const themeIcon = computed(() => {
  return darkMode.value ? "fa-sun" : "fa-moon"
})

function toggleTheme() {
  darkMode.value = !darkMode.value
  document.documentElement.setAttribute("data-theme", darkMode.value ? "dark" : "light");
  window.localStorage.setItem("srcds-theme", darkMode.value ? "dark" : "light")
  active.value = false
}

async function logout() {
  try {
    const res = await fetch('/api/auth/logout')
    if(res.ok) {
      emit('logout')
      notify({
        type: "success",
        text: "You have been logged out successfully"
      })
      if(route.meta.authRequired) {
        router.push('/')
      }
    } else {
      if(res.status == 401) {
        emit('logout')
        notify({
          type: "error",
          text: "You were already logged out"
        })
        if(route.meta.authRequired) {
          router.push('/')
        }
      } else {
        const json = await res.json()
        notify({
          type: "error",
          title: "Logout Failed",
          text: json.message
        })
      }
    }
  } catch(err: any) {
    notify({
      type: "error",
      title: "Logout Failed",
      text: err.message
    })
  }
}

async function clearNotifications() {
  showModal.value = undefined;
  if(!props.privUser) return
  notificationsClearing.value = true
  await props.privUser.clearNotifications()
  notificationsClearing.value = false
}

onBeforeMount(() => {
  if(window.localStorage['srcds-theme']) {
    document.documentElement.setAttribute("data-theme", window.localStorage['srcds-theme']);
    darkMode.value = window.localStorage['srcds-theme'] === "dark"
  }
})
</script>

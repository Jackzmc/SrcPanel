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
        <!-- TODO: merge as NavBarItem ?-->
        <template v-for="route in shownRoutes" :key="route.name">
          <template v-if="!route.meta?.requiresAuth || privUser != undefined">
            <div v-if="route.children.length > 0" class="navbar-item has-dropdown is-hoverable">
              <a class="navbar-link">
                <NavBarLabel :route="route" />
              </a>
              <div class="navbar-dropdown is-left" style="width: max-content">
                <template v-for="child in route.children" :key="child.name">
                  <hr class="navbar-divider" v-if="child.showDivider">
                  <NavBarItem :route="child" />
                </template>
              </div>
            </div>

            <NavBarItem v-else :route="route" />
          </template>
        </template>
      </div>
      <div class="navbar-end">
        <!-- <div class="navbar-item">
          <Field icon-left="fa-search">
            <input type="text" class="input" placeholder="Search..." v-model="searchQuery" @keyup.enter.prevent="performSearch" />
          </Field>
        </div> -->
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
              <router-link class="navbar-item" :to="{ name: 'manage-user', params: { id: privUser.id }, query: { returnTo: route.fullPath }}">
                <Icon icon="fa-user" text="Profile" />
              </router-link>
              <a class="navbar-item" @click="showModal = 'settings'">
                <Icon icon="fa-gear" text="User Settings" />
              </a>
              <router-link class="navbar-item" to="/panel/dashboard" v-if="privUser!.hasPermission('panel.view')">
                <Icon icon="fa-sitemap" text="Panel Administration" />
              </router-link>
              <hr class="navbar-divider">
              <a class="navbar-item has-text-danger" @click="logout">
                <Icon icon="fa-arrow-right-from-bracket">Logout</Icon>
              </a>
            </div>
          </div>
        </template>
        <template v-else-if="meta && !hideLogin">
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
import UserSettingsModal from '@/components/modals/UserSettingsModal.vue';
import NotificationsModal from '@/components/modals/NotificationsModal.vue'
import { PanelMetaInfo } from '../../../../common-types/Panel.js';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import Field from '@/components/Field.vue';
import NavBarItem from './NavBarItem.vue';
import NavBarLabel from './NavBarLabel.vue';

let active = ref(false)
let searchQuery = ref()

const router = useRouter()
const route = useRoute()
const emit = defineEmits(['logout', 'notifications:clear', "toggle-theme"])

watch(() => route.fullPath, () => {
  active.value = false
})

const shownRoutes = computed(() => {
  return router.getRoutes()
    .filter(route => {
      return route.meta.nav != undefined && route.meta.topLevel
    })
    .map(route => {
      console.log(route.name, route.children)
      return {
        ...route,
        children: route.children
          .filter(child => {
            return child.meta?.nav != undefined
          })
          .map((child, i, list) => {
            const prevChildSection = i > 0 && list[i-1].meta?.nav?.section || 0
            const ourSection = child.meta?.nav?.section || 0
            return {
              ...child,

              showDivider: ourSection > prevChildSection
            }
          })
      }
    })
})

const LAST_UPDATED = new Date(Number(BUILD_TIMESTAMP))

const props = defineProps<{
  privUser?: PrivilegedUser,
  meta?: PanelMetaInfo,
  hideLogin?: boolean,
  theme: string
}>()

let showModal = ref<string>()
let notificationsClearing = ref<boolean>()

const avatarUrl = computed(() => {
  return props.privUser ? props.privUser.avatarUrl : ""
})

const themeIcon = computed(() => {
  return darkMode.value ? "fa-sun" : "fa-moon"
})

const darkMode = computed(() => {
  return props.theme === "dark"
})

function performSearch() {
  if(searchQuery.value.trim() != "")
  router.push({
    name: "search",
    query: {
      q: searchQuery.value
    }
  })
}

function toggleTheme() {
  emit("toggle-theme")
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
</script>

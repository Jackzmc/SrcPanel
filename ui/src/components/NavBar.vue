<template>
<div>
  <UserSettingsModal v-if="showSettings&&userdata&&privUser" :userdata="userdata" :priv-user="privUser" @close="showSettings = false" />
  <nav class="navbar is-info is-fixed-top" role="navigation" aria-label="main navigation">
    <div class="navbar-brand">
      <a role="button" class="navbar-burger" aria-label="menu" aria-expanded="false" data-target="navMenu">
        <span aria-hidden="true"></span>
        <span aria-hidden="true"></span>
        <span aria-hidden="true"></span>
      </a>
    </div>

    <div class="navbar-menu"  id="navMenu">
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
            <router-link to="/docs/plugins" class="navbar-item">
              Server Plugin Information
            </router-link>
            <router-link to="/docs/notes" class="navbar-item">
              Player Notes
            </router-link>
          </div>
        </div>
        <div class="navbar-item has-dropdown is-hoverable" v-if="privUser">
          <a class="navbar-link">
            <Icon icon="toolbox">Administration</Icon>
          </a>
          <div class="navbar-dropdown is-left" style="width:140%">
            <router-link to="/admin/addons" class="navbar-item">
              <Icon icon="fa-puzzle-piece">Addons / Maps</Icon>
            </router-link>
            <router-link to="/admin/servers" class="navbar-item">
              <Icon icon="fa-server">Servers</Icon>
            </router-link>
            <router-link to="/admin/activity" class="navbar-item">
              <Icon icon="list">Activity Log <span class="tag">Legacy</span></Icon>
            </router-link>
            <router-link to="/admin/audit" class="navbar-item">
              <Icon icon="list">Activity Log</Icon>
            </router-link>
            <router-link to="/admin/players" class="navbar-item">
              <Icon icon="users-gear">Manage Players</Icon>
            </router-link>
            <hr class="navbar-divider">
            <div class="navbar-item">
              <a href="/api/admins/discord" class="button" style="background-color: #5865F2; color: white">
                <Icon icon="fab fa-discord">Join the Discord</Icon>
              </a>
            </div>
          </div>
        </div>
        <router-link to="/bans" class="navbar-item">
          <Icon icon="fa-user-slash">Bans</Icon>
        </router-link>
        <router-link to="/info" class="navbar-item">
          <Icon icon="fa-note-sticky">Player Notes</Icon>
        </router-link>
        <router-link to="/graphs" class="navbar-item">
          <Icon icon="fa-chart-simple">Graphs</Icon>
        </router-link>
      </div>
      <div class="navbar-end">
        <div class="navbar-item" v-if="updateInfo.updating">
          <Icon icon="fa-solid fa-spinner" spin>
            <span class="ml-2">Updating UI...</span>
          </Icon>
        </div>
        <div v-if="privUser" class="navbar-item has-dropdown is-hoverable " >
          <a class="navbar-link">
            <img class="mx-2" :src="avatarUrl" />
            <span>{{privUser.name}}</span>
          </a>
          <div class="navbar-dropdown is-right" style="width:140%">
            <a class="navbar-item">
              <Icon icon="fa-circle-info" :data-tooltip="updateTooltip" class="has-tooltip-bottom">
                <template v-if="updateInfo.updating">UI is being updated</template>
                <template v-else>UI Build Info <em>(hover)</em></template>
              </Icon>
            </a>
            <hr class="navbar-divider">
            <router-link class="navbar-item" :to="{ name: 'manage-user', params: { id: privUser.id }, query: { returnTo: $route.fullPath }}">
              <Icon icon="fa-user" text="Profile" />
            </router-link>
            <a class="navbar-item" @click="showSettings = !showSettings">
              <Icon icon="fa-gear" text="User Settings" />
            </a>
            <router-link class="navbar-item" to="/panel/dashboard" v-if="privUser!.hasPermission('panel.view')">
              <Icon icon="fa-sitemap" text="Panel Administration" />
            </router-link>
            <hr class="navbar-divider">
            <p class="navbar-item" v-if="userdata!.isSessionOld">
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
        <template v-else>
        <div class="navbar-item">
          <DiscordLoginButton />
        </div>
        <div class="navbar-item">
          <SteamLoginButton />
        </div>
        </template>
      </div>
    </div>
  </nav>
</div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import SteamLoginButton from '@/components/SteamLoginButton.vue'
import DiscordLoginButton from '@/components/DiscordLoginButton.vue'
import { useRoute, useRouter } from 'vue-router';
import { notify } from '@kyvg/vue3-notification';
import { PrivilegedUser } from '@/js/User';
import { ClientUserData } from '../../../common-types/User';
import { Service, Action } from '../../../common-types/Privileges';
import UserSettingsModal from './modals/UserSettingsModal.vue';
// Bulma nav code
onMounted(() => {
  const $navbarBurgers = Array.prototype.slice.call(document.querySelectorAll('.navbar-burger'), 0);

  // Add a click event on each of them
  $navbarBurgers.forEach( el => {
    el.addEventListener('click', () => {

      // Get the target from the "data-target" attribute
      const target = el.dataset.target;
      const $target = document.getElementById(target);

      // Toggle the "is-active" class on both the "navbar-burger" and the "navbar-menu"
      el.classList.toggle('is-active');
      $target!.classList.toggle('is-active');

    });
  });
})

const router = useRouter()
const route = useRoute()
const emit = defineEmits(['logout'])

const LAST_UPDATED = new Date(Number(process.env.VUE_APP_BUILD_DATE))

const props = defineProps<{
  userdata?: ClientUserData,
  privUser?: PrivilegedUser,
  updateInfo: any
}>()

let showSettings = ref(false)

const avatarUrl = computed(() => {
  if(!props.userdata) return ''
  return `https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/79/${props.userdata.user.avatarhash}.jpg`
})

const updateTooltip = computed(() => {
  return `${LAST_UPDATED.toLocaleDateString()} at ${LAST_UPDATED.toLocaleTimeString()}`
})


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
      const json = await res.json()
      notify({
        type: "error",
        title: "Logout Failed",
        text: json.message
      })
    }
  } catch(err: any) {
    notify({
      type: "error",
      title: "Logout Failed",
      text: err.message
    })
  }
}
</script>

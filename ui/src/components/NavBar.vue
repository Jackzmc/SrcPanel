<template>
<div>
  <nav class="navbar is-info is-fixed-top" role="navigation" aria-label="main navigation">
    <div class="navbar-brand">
      <a role="button" class="navbar-burger" aria-label="menu" aria-expanded="false" data-target="navbarBasicExample">
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
        <div class="navbar-item has-dropdown is-hoverable " >
          <a class="navbar-link">
            Documentation
          </a>
          <div class="navbar-dropdown is-left">
            <router-link to="/docs/commands" class="navbar-item">
              Commands
            </router-link>
            <router-link to="/docs/cvars" class="navbar-item">
              Cvars
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
              Plugin Development Info
            </router-link>
          </div>
        </div>
        <div class="navbar-item has-dropdown is-hoverable" v-if="userdata">
          <a class="navbar-link">
            Administration
          </a>
          <div class="navbar-dropdown is-left">
            <router-link to="/admin/addons" class="navbar-item">
              Addons / Maps
            </router-link>
            <router-link to="/admin/servers" class="navbar-item">
              Server Management
            </router-link>
            <router-link to="/admin/logs" class="navbar-item">
              Audit & Activity Log
            </router-link>
            <router-link to="/admin/players" class="navbar-item">
              Player Management
            </router-link>
            <hr class="navbar-divider">
            <div class="navbar-item">
              <a href="/api/admins/discord" class="button" style="background-color: #5865F2; color: white">Join the Discord</a>
            </div>
          </div>
        </div>
        <router-link to="/bans" class="navbar-item">
          Bans
        </router-link>
        <router-link to="/info" class="navbar-item">
          Info
        </router-link>
        <router-link to="/graphs" class="navbar-item">
          Graphs
        </router-link>
      </div>
      <div class="navbar-end">
        <div class="navbar-item">
          <span v-if="updateInfo.updating">Updating...</span>
        </div>
        <div v-if="userdata" class="navbar-item has-dropdown is-hoverable " >
          <a class="navbar-link">
            <img class="mx-2" :src="avatarUrl" />
            <span>{{userdata.user.name}}</span>
          </a>
          <div class="navbar-dropdown is-right">
            <a class="navbar-item">
              <span v-if="!updateInfo.updating" :data-tooltip="updateTooltip" class="has-tooltip-bottom">
                UI Version Info
              </span>
            </a>
            <hr class="navbar-divider">
            <router-link class="navbar-item" to="/user/settings">
              Settings
            </router-link>
            <hr class="navbar-divider">
            <a class="navbar-item has-text-danger" @click="logout">
              Logout
            </a>
          </div>
        </div>
        <div class="navbar-item" v-else>
          <LoginButton />
        </div>
      </div>
    </div>
  </nav>
</div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import LoginButton from '@/components/LoginButton.vue'
import { useRoute, useRouter } from 'vue-router';
// Bulma nav code
document.addEventListener('DOMContentLoaded', () => {
  const $navbarBurgers = Array.prototype.slice.call(document.querySelectorAll('.navbar-burger'), 0);
  if ($navbarBurgers.length > 0) {
    $navbarBurgers.forEach( el => {
      el.addEventListener('click', () => {
        const target = el.dataset.target;
        const $target = document.getElementById(target);
        el.classList.toggle('is-active');
        $target!.classList.toggle('is-active');
      });
    });
  }
});

const router = useRouter()
const route = useRoute()
const emit = defineEmits(['logout'])

const LAST_UPDATED = new Date(Number(process.env.VUE_APP_BUILD_DATE))

const props = defineProps([
  'userdata',
  'updateInfo'
])

const avatarUrl = computed(() => {
  if(!props.userdata) return ''
  return `https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/79/${props.userdata.user.avatarhash}.jpg`
})

const updateTooltip = computed(() => {
  return `${LAST_UPDATED.toLocaleDateString()} at ${LAST_UPDATED.toLocaleTimeString()}`
})


async function logout() {
  const res = await fetch('/api/auth/logout')
  if(res.ok) {
    emit('logout')
    if(route.meta.authRequired) {
      router.push('/')
    }
  }
}
</script>

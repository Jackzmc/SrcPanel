<template>
  <div class="modal is-active">
    <div class="modal-background"></div>
    <div class="modal-card">
      <header class="modal-card-head">
        <p class="modal-card-title" v-if="user">
          <b>{{user.name}}</b> <span class="is-pulled-right">{{user.steamid}}</span></p>
        <p v-else>Loading...</p>
        &nbsp;&nbsp;
      </header>
      <section class="modal-card-body" v-if="fetchError">
        <article class="message is-danger">
          <div class="message-body">
            {{fetchError}}
          </div>
        </article>
      </section>
      <section class="modal-card-body" v-else-if="user">
        <div class="tabs is-fullwidth is-boxed is-centered">
          <ul>
            <router-link :disabled="fetchError" :to="{ name: 'manage-user-overview' }" v-slot="{ href, navigate, isExactActive }" custom>
              <li :class="{'is-active': isExactActive}">
                <a :href="href" @click="navigate">Overview</a>
              </li>
            </router-link>
            <router-link :disabled="fetchError" :to="{ name: 'manage-user-admin' }" v-slot="{ href, navigate, isExactActive }" custom>
              <li :class="{'is-active': isExactActive}">
                <a :href="href" @click="navigate">
                  Privileges&nbsp;
                  <span v-if="userAdminData" class="tag is-info">Admin</span>
                  <span v-else class="tag is-secondary">None</span>
                </a>
              </li>
            </router-link>
            <router-link :disabled="fetchError" :to="{ name: 'manage-user-notes' }" v-slot="{ href, navigate, isExactActive }" custom>
              <li :class="{'is-active': isExactActive}">
                <a :href="href" @click="navigate">Notes ({{ user?.notesCount ?? 0 }})</a>
              </li>
            </router-link>
            <router-link :disabled="fetchError" :to="{ name: 'manage-user-bans' }" v-slot="{ href, navigate, isActive }" custom>
              <li :class="{'is-active': isActive }">
                <a :href="href" @click="navigate">Bans&nbsp;<span :class="{'has-text-danger': user?.bansCount > 0 }">({{ user?.bansCount }})</span></a>
              </li>
            </router-link>
          </ul>
        </div>
        <router-view :userdata="userdata" :priv-user="privUser" :user="user" :user-admin-data="userAdminData" />
      </section>
      <section class="modal-card-body has-text-centered" v-else>
        <img src="@/assets/loader.gif" />
      </section>
      <footer class="modal-card-foot" id="manage-user-footer">
        <template v-if="fetchError">
          <button class="button is-info" @click="close">Close</button>
          <button class="button is-secondary" @click="getUser">Retry</button>
        </template>
        <button class="button" @click="close">Close</button>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, onBeforeMount } from 'vue';
import { User, PrivilegedUser, PlayerData } from '@/js/User'
import { useRouter, useRoute } from 'vue-router'
import { Session, WebPermission, WebRole, FLAGS, WEB_FLAGS, AdminData, AdminGroup } from '../../../../../common-types/User';
// @ts-ignore
import { Tab, Tabs } from 'vue3-tabs-component'
import { notify } from '@kyvg/vue3-notification';

const router = useRouter()
const route = useRoute()
const props = defineProps<{
  userdata: Session
}>()
const privUser = new PrivilegedUser(props.userdata)

let user = ref<PlayerData>()
let userAdminData = ref<AdminData>()
let fetchError = ref<string>()
let returnTo = ref<string>()


function close() {
  if(returnTo.value) {
    router.push(returnTo.value)
  } else
    router.push(`/admin/players/`)
}

async function getUser() {
  try {
    const response = await fetch(`/api/users/${route.params.id}?include=admin`)
    const json = await response.json()
    if(response.ok) {
      if(!json.user) {
        notify({
          type: "error",
          title: "Could not get user info",
          text: json.message
        })
        fetchError.value = "Unknown User"
        return
      }
      userAdminData.value = json.adminData
      user.value = json.user
    } else {
      notify({
        type: "error",
        title: "Could not get user info",
        text: json.message
      })
      fetchError.value = json.message
    }
  } catch(err: any) {
    notify({
      type: "error",
      title: "Could not get user info",
      text: err.message
    })
    fetchError.value = err.message
  }
}

onBeforeMount(async () => {
  document.addEventListener('keydown', (event) => {
    const e = event || window.event;
    if(e.key == "Escape") {
      close()
    }
  });
  await getUser()
  if(route.query.returnTo) returnTo.value = decodeURIComponent(route.query.returnTo.toString())
})
</script>

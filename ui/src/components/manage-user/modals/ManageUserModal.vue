<template>
  <div class="modal is-active">
    <div class="modal-background"></div>
    <div class="modal-card">
      <header class="modal-card-head">
        <p class="modal-card-title" v-if="user">
          <image class="image is-24x24 is-inline-block mr-2">
            <img :src="'/api/users/' + user.steamid + '/avatar'" />
          </image>
          <b>{{user.name}}</b> <br class="is-hidden is-flex-touch"> <span class="is-pulled-right">{{user.steamid}}</span>
        </p>
        <p v-else-if="fetchError" class="modal-card-title has-text-danger">Error</p>
        <Icon icon="spinner" v-else spin class="is-size-4">Fetching user details</Icon>
        &nbsp;&nbsp;
      </header>
      <section class="modal-card-body" v-if="fetchError">
        <article class="message is-danger">
          <div class="message-body">
            {{fetchError}}
          </div>
        </article>
      </section>
      <section class="modal-card-body px-0 pt-4">
        <div class="tabs is-fullwidth is-boxed is-centered">
          <ul>
            <router-link :to="{ name: 'manage-user-overview', params: { tab: 'stats' } }" v-slot="{ href, navigate}" custom>
              <li :class="{'is-active': route.name === 'manage-user-overview' }">
                <a :href="href" @click="navigate">
                  <Icon icon="fa-info-circle">Overview</Icon>
                </a>
              </li>
            </router-link>
            <router-link v-if="privUser.hasPermission('admins.view')" :to="{ name: 'manage-user-admin' }" v-slot="{ href, navigate, isExactActive }" custom>
              <li :class="{'is-active': isExactActive, 'has-text-grey-dark': true }">
                <a :href="href" @click="navigate">
                  <Icon :icon="userAdminData ? 'fa-user-pen' : 'fa-user-plus'">Privileges&nbsp;</Icon>
                  <span v-if="userAdminData" class="tag is-info">Admin</span>
                  <span v-else class="tag is-secondary">None</span>
                </a>
              </li>
            </router-link>
            <router-link v-if="privUser.hasPermission('notes.view')" :to="{ name: 'manage-user-notes' }" v-slot="{ href, navigate, isExactActive }" custom>
              <li :class="{'is-active': isExactActive }">
                <a :href="href" @click="navigate">
                  <Icon icon="fa-note-sticky">Notes <span class="tag ml-1 is-rounded">{{ user?.notesCount ?? 0 }}</span></Icon>
                </a>
              </li>
            </router-link>
            <router-link v-if="privUser.hasPermission('bans.view')" :to="{ name: 'manage-user-bans' }" v-slot="{ href, navigate }" custom>
              <li :class="{'is-active': route.name === 'manage-user-bans' }">
                <a :href="href" @click="navigate">
                  <Icon icon="fa-gavel">
                    Bans <span :class="['tag','ml-1','is-rounded',{'is-danger': user && user.bansCount > 0}]">{{ user?.bansCount ?? 0 }}</span>
                    <!-- Bans&nbsp;<span :class="{'has-text-danger': user && user.bansCount > 0 }">({{ user?.bansCount ?? 0 }})</span> -->
                  </Icon>
                </a>
              </li>
            </router-link>
          </ul>
        </div>
        <router-view class="block px-6" :priv-user="privUser" :user="user" :user-admin-data="userAdminData" @close="router.push(routerHref)" @update-user="onUserUpdate" v-if="user" />
        <div class="block px-6" v-else>
          <div class="block skeleton-lines">
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
          </div>
          <div class="block skeleton-lines">
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
          </div>
        </div>
      </section>
      <!-- <section class="modal-card-body has-text-centered" v-else>
        <div class="skeleton-block"></div>
        <img src="@/assets/loader.gif" />
      </section> -->
      <footer class="modal-card-foot">
        <div class="buttons"  id="manage-user-footer">
          <router-link class="button" :to="routerHref">
            <Icon icon="close">Close</Icon>
          </router-link>
          <template v-if="fetchError">
            <router-link class="button is-info" :to="routerHref">Close</router-link>
            <button class="button is-secondary" @click="getUser">Retry</button>
          </template>
        </div>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, onBeforeMount, watch, onBeforeUnmount } from 'vue';
import { User, PrivilegedUser, PlayerData } from '@/js/User'
import { useRouter, useRoute } from 'vue-router'
import { AdminData } from '../../../../../common-types/User';
// @ts-ignore
import { Tab, Tabs } from 'vue3-tabs-component'
import { notify } from '@kyvg/vue3-notification';

const router = useRouter()
const route = useRoute()
const props = defineProps<{
  privUser: PrivilegedUser
}>()

let user = ref<PlayerData>()
let userAdminData = ref<AdminData>()
let fetchError = ref<string>()
let returnTo = ref<string>()

const routerHref = computed(() => {
  return returnTo.value ?? '/admin/players'
})

async function getUser() {
  user.value = undefined
  fetchError.value = undefined
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

function closeModal(event: KeyboardEvent) {
  const e = event || window.event;
    if(e.key == "Escape") {
      close()
    }
}

function onUserUpdate(newUser: any) {
  console.log('getting user update', newUser)
  if(!user.value) return
  user.value.name = newUser.name
}

onBeforeMount(() => {
  if(route.query.returnTo) returnTo.value = decodeURIComponent(route.query.returnTo.toString())
  if(route.query.returnTo) router.push({ query: { returnTo: route.query.returnTo.toString() }})
  document.addEventListener('keydown', closeModal)
  if(route.name === "manage-user-default") {
    router.push({ ...route, name: "manage-user" })
  }
})
onMounted(async () => {
  if(route.params.id)
    await getUser()
})
onBeforeUnmount(() => {
  document.removeEventListener('keydown', closeModal)
}),



watch(() => route.params.id, async (value) => {
  if(!value) return
  if(route.query.returnTo) {
    returnTo.value = decodeURIComponent(route.query.returnTo.toString())
    router.push({ query: { returnTo: route.query.returnTo.toString() }})
  }
  await getUser()
})
</script>

<style scoped>
.modal-card {
  width: 50%;
}
@media screen and (max-width: 768px) {
  .modal-card {
    width: 90%;
  }
}
</style>

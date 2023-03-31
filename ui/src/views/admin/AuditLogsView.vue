<template>
<div class="container">
  <article class="message is-warning">
    <div class="message-body content">
      <b>Feature in development</b><br>
      In the meantime, you can still use the <router-link :to="{name: 'logs-activity' }">Activity Logs</router-link>.
    </div>
  </article>
  <div class="columns">
    <div class="column is-8 box">
      <div class="list has-visible-pointer-controls has-hoverable-list-items">
        <template v-for="entry in entries" :key="entry.id">
          <div class="list-item">
            <div class="list-item-image">
              <figure class="image is-48x48">
                <img class="is-rounded" :src="entry.activator.avatarUrl">
              </figure>
            </div>

            <div class="list-item-content">
              <div class="list-item-title">
                {{ new Date(entry.timestamp).toLocaleDateString() }} at {{ new Date(entry.timestamp).toLocaleTimeString(undefined, { timeStyle: 'short' }) }}
                <span class="ml-2 has-text-grey-light is-inline subtitle is-6">{{ getRelDate(entry.timestamp / 1000) }}</span>
                <span class="tags is-pulled-right">
                  <span class="tag is-pulled-right is-info">Action</span>
                  <span class="tag is-pulled-right is-dark">reserved</span>
                </span>
              </div>
              <div class="list-item-description">
                <UserComponent :user="entry.activator" is-admin />
                {{entry.message}}
                <span v-html='entry._html' />
                <UserComponent v-if="entry.target" :user="entry.target"/>
                {{ entry._message2 }}
                </div>
            </div>

            <div class="list-item-controls">
              <div class="buttons is-right">
                <!-- <button :class="['button', {'is-info': entry.showDetails, 'is-outlined': entry.showDetails }]">
                  <span @click="entry.showDetails = !entry.showDetails">Details</span>
                </button> -->
                <button class="button is-inverted is-outlined is-black" @click="entry.showDetails = !entry.showDetails">
                  <Icon icon-class="is-small has-text-black" :icon="entry.showDetails ? 'fa-chevron-up' : 'fa-chevron-down'" />
                </button>
              </div>
            </div>
          </div>
          <div class="list-item  px-0 mx-0 my-0 py-0" v-if="entry.showDetails">

            <div class="list-item-content">
              <div class="notification is-dark">
                <p><b>Id:</b> #{{ entry.id }}</p>
                <p><b>Server: </b><span class="tag is-info">reserved</span></p>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</div>
</template>


<script setup lang="ts">
import { UserData } from '../../../../common-types/User.js';
import { useNotification } from '@kyvg/vue3-notification';
import { PrivilegedUser } from '@/js/User';
import { ref, onBeforeMount } from 'vue';
import UserComponent from '@/components/UserComponent.vue';
import { getRelDate, request } from '@/js/util';
import { faTruckLoading } from '@fortawesome/free-solid-svg-icons';

const { notify } = useNotification();

const props = defineProps<{
  userdata: UserData,
  privUser: PrivilegedUser
}>();

let loading = ref(false)
let expandedId = ref()
let page = ref(1);
let limit = ref(30);
let entries = ref([
  {
    showDetails: false,
    id: 1,
    activator: {
      name: "Jackzie ❤",
      steamid: "STEAM_1:0:49243767",
      avatarUrl: "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/79/672f1a349cdeb1273ec566bb40c126bb73d86d3e.jpg"
    },
    target: {
      name: "Disgruntled Pea",
      steamid: 'blah',
      avatarUrl: "https://avatars.cloudflare.steamstatic.com/4d7836164e9a2e342afbb4334b237f96bff0c5cd_full.jpg"
    },
    message: "did an action on",
    timestamp: Date.now()
  },
  {
    showDetails: false,
    id: 2,
    activator: {
      name: "Jackzie ❤",
      steamid: "STEAM_1:0:49243767",
      avatarUrl: "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/79/672f1a349cdeb1273ec566bb40c126bb73d86d3e.jpg"
    },
    target: {
      name: "Disgruntled Pea",
      steamid: 'blah',
      avatarUrl: "https://avatars.cloudflare.steamstatic.com/4d7836164e9a2e342afbb4334b237f96bff0c5cd_full.jpg"
    },
    message: "did another action on",
    timestamp: Date.now() - 500000
  },
  {
    showDetails: false,
    id: 3,
    activator: {
      name: "Ashley Golix ❤",
      steamid: "STEAM_1:0:530680608",
      avatarUrl: "https://avatars.cloudflare.steamstatic.com/e046c40c4d06f48b4e84711b064da1c09bea47ed_full.jpg"
    },
    target: {
      name: "Disgruntled Pea",
      steamid: 'blah',
      avatarUrl: "https://avatars.cloudflare.steamstatic.com/4d7836164e9a2e342afbb4334b237f96bff0c5cd_full.jpg"
    },
    message: "murdered and banned",
    _message2: "for \"being stupid, spamming notes, and more\"",
    timestamp: Date.now() - 90000000
  },
  {
    showDetails: false,
    id: 4,
    activator: {
      name: "Jackzie ❤",
      steamid: "STEAM_1:0:49243767",
      avatarUrl: "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/79/672f1a349cdeb1273ec566bb40c126bb73d86d3e.jpg"
    },
    _html: "updated the admin panel",
    timestamp: Date.now() - 2590000000
  },
  {
    showDetails: false,
    id: 4,
    activator: {
      name: "Jackzie ❤",
      steamid: "STEAM_1:0:49243767",
      avatarUrl: "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/79/672f1a349cdeb1273ec566bb40c126bb73d86d3e.jpg"
    },
    target: {
      name: "Disgruntled Pea",
      steamid: 'blah',
      avatarUrl: "https://avatars.cloudflare.steamstatic.com/4d7836164e9a2e342afbb4334b237f96bff0c5cd_full.jpg"
    },
    _html: "granted <b>privileges</b> to ",
    timestamp: Date.now() - 9590000000
  }
])

async function fetchLogs() {
  loading.value = true
  const response = await request("/api/logs/?servers=web&page=1&limit=100")
  loading.value = false
  if(response?.ok) {
    const json = await response.json()
    entries.value = json.logs.map((entry: any) => {
      return {
        id: entry.id,
        timestamp: entry.timestamp,
        server: entry.server,
        type: entry.type,
        activator: entry.client ? {
          steamid: entry.client,
          name: entry.clientName,
          avatarUrl: "https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/79/672f1a349cdeb1273ec566bb40c126bb73d86d3e.jpg"
        } : null,
        target: entry.target ? {
          steamid: entry.target,
          name: entry.targetName,
          avatarUrl: "https://avatars.cloudflare.steamstatic.com/4d7836164e9a2e342afbb4334b237f96bff0c5cd_full.jpg"
        } : null,
        message: entry.message
      }
    })
  }
}

onBeforeMount(() => {
  fetchLogs()
})

</script>

<style src="../../../node_modules/bulma-list/css/bulma-list.css" />

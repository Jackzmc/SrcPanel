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
      <div class="list has-visible-pointer-controls">
        <div class="list-item" v-for="entry in entries" :key="entry.id">
          <div class="list-item-image">
            <figure class="image is-48x48">
              <img class="is-rounded" :src="entry.activator.avatarUrl">
            </figure>
          </div>

          <div class="list-item-content">
            <div class="list-item-title">
              {{ new Date(entry.timestamp).toLocaleDateString() }} at {{ new Date(entry.timestamp).toLocaleTimeString() }}
              <span class="ml-2 has-text-grey is-inline subtitle is-6">{{ getRelDate(entry.timestamp / 1000) }}</span>
            </div>
            <div class="list-item-description">
              <UserComponent :user="entry.activator" is-admin />
              {{entry.message}}
              <span v-html='entry._html' />
              <UserComponent :user="entry.target"/>
              {{ entry._message2 }}
              </div>
          </div>

          <div class="list-item-controls">
            <div class="buttons is-right">
              <button class="button">
                <span class="icon is-small">
                  <i class="fas fa-edit"></i>
                </span>
                <span>Edit</span>
              </button>

              <button class="button">
                <span class="icon is-small">
                  <i class="fas fa-ellipsis-h"></i>
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
</template>

<style type="sass">
@import "../../../node_modules/bulma-list/css/bulma-list.css";
</style>

<script setup lang="ts">
import { UserData } from '../../../../common-types/User.js';
import { useNotification } from '@kyvg/vue3-notification';
import { PrivilegedUser } from '../../js/User';
import { ref } from 'vue';
import UserComponent from '@/components/UserComponent.vue';
import { getRelDate } from '../../js/util';

const { notify } = useNotification();

const props = defineProps<{
  userdata: UserData,
  privUser: PrivilegedUser
}>();

let page = ref(1);
let limit = ref(30);
let entries = ref([
  {
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
    id: 2,
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
    _html: "granted <b>privileges</b> to ",
    timestamp: Date.now() - 9590000000
  }
])

</script>

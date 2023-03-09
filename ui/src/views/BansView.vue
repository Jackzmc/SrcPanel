<template>
<div>
  <router-view :ban="edit.data" @edit="onEdit" :userdata="userdata" />
  <!-- <BanEditModal v-if="edit.banIndex !== null" :ban="edit.data" @edit="onEdit" :userdata="userdata" /> -->
  <div class="container is-fluid">
    <div class="columns">
      <div class="column">
        <p class="subtitle is-4">Viewing {{filteredBans.length}} bans</p>
        <p class="has-text-danger" v-if="ban_error">{{ban_error}}</p>
      </div>
      <div class="column is-2">
        <label class="checkbox">
          <input type="checkbox" class="checkbox" v-model="showOnlyAppeals" />
          Only Appeals
        </label>
        <label class="checkbox">
          <input type="checkbox" class="checkbox" v-model="showExpired" />
          Show Expired Bans
        </label>
      </div>
    </div>

    <table class="table is-fullwidth" v-if="!loading&&!error">
      <thead>
        <th style="width:0">Player</th>
        <th>Executor</th>
        <th v-if="userdata">Reason</th>
        <th>Public Reason</th>
        <th>Flags</th>
        <th>Expires</th>
        <th>Attempts</th>
        <th>Date</th>
        <th v-if="userdata">Action</th>
      </thead>
      <tbody>
        <tr v-for="(ban) in filteredBans" :key="ban.id" :class="{'has-text-grey-light': ban.expired}">
          <td>
            <b v-if="ban.client.name">{{ban.client.name}}<br></b>
            <em class='has-text-info'>{{ban.client.id}}</em>
          </td>
          <td>
            <b v-if="ban.executor.name" :data-tooltip="ban.executor.id">{{ban.executor.name}} </b>
            <template v-else>
              <em v-if="ban.executor.name" class='has-text-info'>{{ban.executor.name}}</em>
              <em v-else>{{ban.executor.id}}</em>
            </template>
            <p class='has-text-info' v-if="ban.executor.source"><em>via {{ban.executor.source}}</em></p>
          </td>
          <td v-if="userdata">
            {{ban.reason}}
          </td>
          <td>
            {{ban.publicReason}}
          </td>
          <td>
            <div class="tags" v-html="getBanFlags(ban)"></div>
          </td>
          <td>
            <span v-if="ban.expired" class="has-text-danger">Expired</span>
            <span v-else>{{formatDaysAgo(ban.expires) || 'Never'}}</span>
          </td>
          <td>{{ban.joinAttempts}}</td>
          <td :data-tooltip="formatDate(ban.timestamp)">
            <p>{{ban.relDate}}</p>
            <p class="has-text-grey">{{ new Date(ban.timestamp * 1000).toLocaleDateString() }}</p>
          </td>
          <td v-if="userdata">
            <div class="buttons">
              <router-link class="button is-info is-small" :to="{name: 'manage-user-bans', params: { id: ban.client.id, banid: ban.id }, query: { returnTo: $route.fullPath }}">View</router-link>
              <!-- <a class="button is-info is-small" @click="startEdit(ban, i)">View</a> -->
            </div>
          </td>
        </tr>
      </tbody>
    </table>
    <p class="has-text-centered has-text-danger title is-3" v-else-if="error">{{error}}</p>
    <p class="has-text-centered title is-2" v-else><br>Fetching bans...</p>
  </div>
</div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onBeforeMount, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Sugar from 'sugar'
import { ListAPIBan } from '../../../common-types/Ban.js';
import { formatDate } from '@/js/util'

const DISCORD_SOURCE_REGEX = new RegExp(/([^\n]+#\d{4})\s\((\d+)\)/)
const AUTO_REFRESH_INTERVAL = 1000 * 60 * 15

const emit = defineEmits([])
const router = useRouter()
const props = defineProps([
  "userdata"
])

interface Ban extends ListAPIBan {
  relDate?: string
}

let loading = ref(true)
let error = ref<string>()
let ban_error = ref<string>()
let bans = ref<Ban[]>([])
let edit = ref<{data?: Ban, banIndex?: number}>({})
let shiftPressed = ref(false)
let showExpired = ref(false)
let showOnlyAppeals = ref(false)


const filteredBans = computed(() => {
  return bans.value.filter(ban => {
    if(!showExpired.value && ban.expired) return false
    if(showOnlyAppeals.value && ban.appealsCount == 0) return false
    return true
  })
})

function onEdit(inEdit: Ban) {
  // TODO: Figure out why it replaces wrong idnex
  if(edit.value.banIndex)
    bans.value[edit.value.banIndex] = inEdit
  edit.value.data = undefined
  edit.value.banIndex = 0
  router.back()
}
function getBanFlags(ban: Ban) {
  let str = ""
  if(ban.flags & 1) str += `<span class='tag' data-tooltip='Player is IP banned'>IP</span>`
  if(ban.flags & 2) str += `<span class='tag is-warning' data-tooltip='Ban is no longer in effect'>S</span>`
  if(ban.appealsCount > 0) str += `<span class='tag is-success' data-tooltip="Has ban appeal(s)">A</span>`
  if(ban.notesCount > 0) str += `<span class='tag is-dark' data-tooltip="Has note(s) attached">N</span>`
  return str
}
function startEdit(ban: Ban, index: number) {
  edit.value.banIndex = index
  edit.value.data = ban
  router.push({
    name: "manage-users-bans",
    params: {
      id: ban.client.id,
      banid: ban.id
    }
  })
}
function formatDaysAgo(value?: number, locale?: string) {
  if(!value) return
  const date = new Date(value*1000);
  const deltaDays = (date.getTime() - Date.now()) / (1000 * 3600 * 24);
  const formatter = new Intl.RelativeTimeFormat(locale);
  return formatter.format(Math.round(deltaDays), 'days');
}
function fetchBans() {
  fetch('/api/bans', { credentials: 'include' })
    .then(response => {
      if(response.ok)
        return response.json()
      else
        error.value = response.statusText
    })
    .then(result => {
      if(result.error) {
        return ban_error.value = result.message || result.error
      }
      bans.value = result.bans.map((ban: Ban) => {
        const relDate = new Sugar.Date(ban.timestamp*1000).relative()
        const discordBanMatch = ban.executor.id.match(DISCORD_SOURCE_REGEX)
        if(discordBanMatch && discordBanMatch.length == 3) {
          ban.executor.id = discordBanMatch[2]
          ban.executor.name = discordBanMatch[1]
          ban.executor.source = "discord"
        }
        if(ban.executor.id === "CONSOLE") ban.executor.id = '[Automatic]'
        return {
          ...ban,
          relDate,
        }
      })
    })
    .catch(err => {
        console.error('Could not fetch bans, network error.', err)
    })
    .finally(() => loading.value = false)
}

onMounted(() => {
  document.onkeydown = (e) => {
    shiftPressed.value = !!e.shiftKey
  }
  document.onkeyup = (e) => {
    shiftPressed.value = !!e.shiftKey
  }
  fetchBans()
  setInterval(() => {
    fetchBans()
  }, AUTO_REFRESH_INTERVAL)
})
</script>

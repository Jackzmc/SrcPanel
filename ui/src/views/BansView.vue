<template>
<div class="container is-fluid">
  <div class="columns">
    <div class="column">
      <p class="subtitle is-4">Viewing <input type="number" class="input" min=20 max=1000 step=10 style="width:8%" v-model="limit" @blur="changeLimit" /> / {{totalBansCount.toLocaleString()}} bans</p>
      <p class="subtitle is-6">Click a user's name to view more detailed ban information</p>
      <p class="has-text-danger" v-if="ban_error">{{ban_error}}</p>
    </div>
    <div class="column is-2">
      <div class="field">
        <input id="onlyAppealsButton" type="checkbox" class="switch" v-model="showOnlyAppeals">
        <label for="onlyAppealsButton">Only Appeals</label>
      </div>
      <div class="field">
        <input id="showExpiredButton" type="checkbox" class="switch is-danger" v-model="showExpired" @change="fetchBans(true)">
        <label for="showExpiredButton">Show Expired Bans</label>
      </div>
    </div>
  </div>

  <Pagination :page="page" :limit="limit" :count="bansCount" @page="setPage"></pagination>
  <table class="table is-fullwidth" v-if="!loading&&!error">
    <thead>
      <th style="width:0">Player</th>
      <th>Executor</th>
      <th v-if="userdata">Reason</th>
      <th>Public Reason</th>
      <th>Flags</th>
      <th>Expires</th>
      <th data-tooltip="The amount of times user has tried to join">Attempts</th>
      <th width="10%">Date</th>
    </thead>
    <tbody>
      <tr v-for="(ban) in filteredBans" :key="ban.id" :class="{'has-text-grey-light': ban.expired}">
        <td data-tooltip="Click to view more detailed ban information">
          <p>
            <router-link
              v-if="ban.client.name"
              class="is-small"
              :to="{name: 'manage-user-bans', params: { id: ban.client.id, banid: ban.id }, query: { returnTo: $route.fullPath }}"
            ><component :is="ban.flags & APIBanFlags.Suspended ? 'span' : 'b'">{{ ban.client.name }}</component></router-link>
            <em v-else>(unknown name)</em>
          </p>
          <router-link
            class="is-small has-text-black"
            :to="{name: 'manage-user-bans', params: { id: ban.client.id, banid: ban.id }, query: { returnTo: $route.fullPath }}"
          ><em>{{ ban.client.id }}</em></router-link>
        </td>
        <td>
          <router-link
            v-if="ban.executor.name"
            class="is-small has-text-black"
            :data-tooltip="ban.executor.id"
            :to="{name: 'manage-user-bans', params: { id: ban.client.id, banid: ban.id }, query: { returnTo: $route.fullPath }}"
          ><b>{{ ban.executor.name }}</b></router-link>
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
      </tr>
    </tbody>
  </table>
  <p class="has-text-centered has-text-danger title is-3" v-else-if="error">{{error}}</p>
  <p class="has-text-centered subtitle is-3" v-else><br>
    <Icon icon="spinner" spin icon-class="mr-4"> Fetching bans</Icon>
  </p>
  <Pagination :page="page" :limit="limit" :count="bansCount" @page="setPage"></pagination>
</div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onBeforeMount, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Sugar from 'sugar'
import { ListAPIBan } from '../../../common-types/Ban.js';
import { formatDate, request } from '@/js/util'
import { APIBanFlags } from '../../../common-types/Ban';
import Pagination from '@/components/Pagination.vue'
import 'bulma-switch'

const DISCORD_SOURCE_REGEX = new RegExp(/([^\n]+#\d{4})\s\((\d+)\)/)
const AUTO_REFRESH_INTERVAL = 1000 * 60 * 15

const emit = defineEmits([])
const router = useRouter()

const props = defineProps({
  userdata: null
})
interface Ban extends ListAPIBan {
  relDate?: string
}

let limit = ref(100)
let totalBansCount = ref(0)
let page = ref(1)
let loading = ref(true)
let error = ref<string>()
let ban_error = ref<string>()
let bans = ref<Ban[]>([])
let shiftPressed = ref(false)
let showExpired = ref(false)
let showOnlyAppeals = ref(false)

const bansCount = computed(() => {
  return hasFilter.value ? filteredBans.value.length : totalBansCount.value
})
const hasFilter = computed(() => {
  return showOnlyAppeals.value === true
})
const filteredBans = computed(() => {
  return bans.value.filter(ban => {
    if(showOnlyAppeals.value && ban.appealsCount === 0) return false
    return true
  })
})

function getBanFlags(ban: Ban) {
  let str = ""
  if(ban.flags & APIBanFlags.IPBan) str += `<span class='tag' data-tooltip='Player is IP banned'>IP</span>`
  if(ban.flags & APIBanFlags.Suspended) str += `<span class='tag is-warning' data-tooltip='Ban is no longer in effect'>S</span>`
  if(ban.appealsCount > 0) str += `<span class='tag is-success' data-tooltip="Has ban appeal(s)">A</span>`
  if(ban.notesCount > 0) str += `<span class='tag is-dark' data-tooltip="Has note(s) attached">N</span>`
  return str
}
function formatDaysAgo(value?: number, locale?: string) {
  if(!value) return
  const date = new Date(value*1000);
  const deltaDays = (date.getTime() - Date.now()) / (1000 * 3600 * 24);
  const formatter = new Intl.RelativeTimeFormat(locale);
  return formatter.format(Math.round(deltaDays), 'days');
}
function setPage(value: number) {
  page.value = value
  fetchBans()
}
function changeLimit() {
  if(limit.value < 20) limit.value = 20
  else if(limit.value > 1000) limit.value = 1000
  fetchBans(true)
}
async function fetchBans(resetPage = false) {
  if(resetPage) page.value = 1
  let include = showExpired.value ? "&include=expired" : ""
  const response = await request(`/api/bans?page=${page.value}${include}&limit=${limit.value}`, { credentials: 'include' })
  loading.value = false
  if(response?.ok) {
    const json = await response.json()
    if(json.error) {
      return ban_error.value = json.message || json.error
    }
    totalBansCount.value = json.totalBans;
    bans.value = json.bans.map((ban: Ban) => {
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
  } else if(response) {
    error.value = (await response.json()).message
  }
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

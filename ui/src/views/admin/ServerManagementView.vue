<template>
<div class="container is-fluid">
  <div class="columns">
    <div class="column is-8">
      <template v-for="group in sortedServers" :key="group.id">
        <h4 class="title is-4">{{ group.name }}</h4>
        <table class="table is-fullwidth">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Players</th>
                    <th>Current Map</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
              <template v-for="server in group.servers" :key="server.id">
                <tr>
                  <td :class="{'is-size-5': server.status.online, 'is-size-6': !server.status.online}">
                    <router-link :to="{name: 'admin-server-view', params: { id: server.id, tab: 'overview' }}" data-tooltip="Click here to manage server">
                      <b :class="getServerClasses(server)" >{{server.name}}</b>
                    </router-link>
                    <div class="tags">
                      <div class="tag" v-for="tag in server.tags" :key="tag">
                        {{ tag }}
                      </div>
                    </div>
                  </td>
                  <td><template v-if="server.status.online">{{server.status.data.players.length}} / {{server.status.data.maxplayers}}</template></td>
                  <td><template v-if="server.status.online">{{ server.status.data.map }}</template></td>
                  <td>
                    <div class="buttons">
                      <template v-if="server.status.online">
                        <template v-if="server.tags.includes('rcon')">
                          <a @click="stopServer(server)" class="button is-dark">Request Restart</a>
                          <a @click="processAction(server, 'unreserve')" class="button is-dark" v-if="server.type === 'source' || server.type === 'left4dead2'">Unreserve</a>
                        </template>
                      </template>
                      <template v-else-if="server.tags.includes('systemd')">
                        <a @click="processAction(server, 'start')" v-if="!starting[server.port]" class="button is-success">Start Server</a>
                      </template>
                    </div>
                  </td>
                </tr>
                <table v-if="selectedServer && selectedServer.id == server.id" class="table is-fullwidth">
                  <tr>
                    <td>
                      {{ selectedServer }}
                      <div class="buttons">
                        <a class="button is-info">Configs</a>
                        <a class="button is-black">Console</a>
                      </div>
                    </td>
                  </tr>
                </table>
              </template>
            </tbody>
        </table>
      </template>
      <p class="is-inline is-pulled-right" style="margin-right: 90px">
        <em v-if="lastRefresh">refreshing in {{lastRefresh}}s</em>
        <Icon icon="spinner" v-else spin />
      </p>
    </div>
    <div class="column">
      <div class="box">
        <b>Request Restart</b> will restart the server if its empty
        <br>
        <b>Start</b> will start the service if the server is currently not running. Check in 1-2 minutes to see if the server goes online.
        <p>Only public support this (servers with <span class="tag">systemd</span> tag) as they are managed differently</p>
        <b>Unreserve</b> will remove the lobby reservation which allows others to join a 5+ game before the reservation is automatically removed (so when people are still loading in)
      </div>
    </div>
  </div>
</div>
</template>

<script setup lang="ts">
import { request } from '@/js/util';
import { notify } from '@kyvg/vue3-notification';
import { ref, computed, onBeforeMount, onDeactivated, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const REFRESH_SECONDS = 6
const REFRESH_INTERVAL = 1000 * REFRESH_SECONDS

let servers = ref<any[]>([])
let shiftPressed = ref(false)
let selectedServer = ref()

let starting = ref<Record<string, boolean>>({})
let refreshTimer = ref<any>()
let secondsTimer = ref<any>()
let lastRefresh = ref<number | undefined>(0)

const sortedServers = computed(() => {
  return servers.value.toSorted((a,b) => a.sortOrder - b.sortOrder)
})
async function processAction(server: any, type: string) {
  if(type === "start") {
    starting.value[server.meta.port] = true
    setTimeout(() => {
      starting.value[server.meta.port] = false
    }, 1000 * 30)
  }
  const response = await fetch(`/api/servers/${server.id}/${type}`, {
    method: 'POST',
    credentials: 'include'
  })
  if(response.ok) {
    // there is no json body:
    if(response.status === 204) {
      notify({ type: 'success', text: `Action ${type} completed succesfully`, title: `Server (${server.id})` })
      return
    }
    const json = await response.json()
    if(json.error) {
      notify({ type: 'error', text: json.message, title: `Server (${server.id}) returned error` })
    } else if(json.response.includes("players online")) {
      notify({ type: 'error', text: "Request failed: There are players online.", title: `Server (${server.id})` })
    } else {
      notify({ type: 'success', text: json.response ?? `Action ${type} completed succesfully`, title: `Server (${server.id})` })
    }
  } else {
    const json = await response.json()
    notify({ type: 'error', text: json.message || json.error, title: `Server (${server.id})` })
  }
}
async function stopServer(server: any) {
  const es = new EventSource(`/api/servers/${server.id}/restart/sse`)
  es.onmessage = (event) => {
    const json = JSON.parse(event.data)
    if(json.state === "done") {
      es.close()
      notify({ type: 'success', text: 'Server has been restarted', title: `Server (${server.id})` })
    } else if(json.error) {
      notify({ type: 'error', text: json.message ?? json.error, title: `Server (${server.id})` })
      es.close()
    } else if(json.state) {
      server.status.state = json.state
    }
  }
}
function getServerClasses(server: any) {
  const classes = ['has-tooltip-arrow']

  if(server.status.online) {
    if(server.status.data.players.length == 0) {
      classes.push('has-text-success')
      classes.push('has-tooltip-success')
    } else {
      classes.push('has-tooltip-warning')
    }
  } else {
    classes.push('has-text-danger')
    classes.push('has-tooltip-danger')
  }

  return classes
}
async function refreshServers(notify = false) {
  if(lastRefresh.value === undefined || document.visibilityState === "hidden") return // wait for last refresh
  lastRefresh.value = undefined
  clearInterval(secondsTimer.value)
  const response = await (notify ? request('/api/servers') : fetch('/api/servers'))
  if(response?.ok) {
    servers.value = await response.json()
    startCountdown()
  } else {
    clearInterval(secondsTimer.value)
  }
}

onUnmounted(() => {
  clearInterval(refreshTimer.value)
  clearInterval(secondsTimer.value)
})


function startCountdown() {
  lastRefresh.value = REFRESH_SECONDS
  secondsTimer.value = setInterval(() => {
    if(--lastRefresh.value! <= 0) {
      clearTimeout(secondsTimer.value)
    }
  }, 1000)
}

onBeforeMount(() => {
  refreshServers(true)
  refreshTimer.value = setInterval(() => {
    refreshServers()
  }, REFRESH_INTERVAL)
})
</script>

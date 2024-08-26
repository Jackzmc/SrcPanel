<template>
<div class="container is-fluid mx-4">
  <div class="columns">
    <div class="column is-8">
      <p class="is-inline is-pulled-right" style="margin-right: 90px">
        <em v-if="lastRefresh">refreshing in {{lastRefresh}}s</em>
        <Icon icon="spinner" v-else spin >Refreshing</Icon>
      </p>
      <ServerTable v-for="group in sortedServers" :key="group.id" :group="group" manage>
      </ServerTable>
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
import ServerTable from '@/components/servers/ServerTable.vue';
import { request } from '@/js/util';
import { notify } from '@kyvg/vue3-notification';
import { ref, computed, onMounted, onDeactivated, onUnmounted } from 'vue'
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

onMounted(() => {
  refreshServers(true)
  refreshTimer.value = setInterval(() => {
    refreshServers()
  }, REFRESH_INTERVAL)
})
</script>

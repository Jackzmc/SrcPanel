<template>
<div class="container is-fluid">
  <div class="columns">
    <div class="column is-8">
      <p :class='message.type' v-if="message" v-html="message.content"></p>

      <table class="table is-fullwidth">
          <thead>
              <tr>
                  <th>Name</th>
                  <th>Players</th>
                  <th>Actions</th>
              </tr>
          </thead>
          <tbody>
            <template v-for="server in servers" :key="server.id">
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
                <td><span v-if="server.status.online">{{server.status.data.players.length}} / {{server.status.data.maxplayers}}</span></td>
                <td>
                  <div class="buttons">
                    <template v-if="server.status.online">
                      <template v-if="server.tags.includes('rcon')">
                        <a @click="processAction(server, 'stop')" class="button is-dark">Request Restart</a>
                        <a @click="processAction(server, 'unreserve')" class="button is-dark">Unreserve</a>
                        <a @click="processAction(server, 'stop?force=1')" class="button is-warning" v-if="shiftPressed">Force Restart</a>
                      </template>
                    </template>
                    <template v-else-if="server.tags.includes('systemd')">
                      <a @click="processAction(server, 'start')" v-if="!starting[server.port]" class="button is-success">Start Server</a>
                    </template>
                    <!-- <a @click="processAction(server, 'update')" class="button is-info">Update</a> -->
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
      <p class="is-inline is-pulled-right" style="margin-right: 90px">
        <em v-if="lastRefresh">refreshing in {{lastRefresh}}s</em>
        <Icon icon="spinner" v-else spin />
      </p>
    </div>
    <div class="column">
      <b>Request Restart</b> will restart the server if its empty
      <br>
      <b>Force Restart</b> requires you to hold SHIFT to select, and will force restart the server even if people are playing
      <br>
      <b>Start</b> will start the service if the server is currently not running. Check in 1-2 minutes to see if the server goes online.
      <p>Only public support this (servers with <span class="tag">systemd</span> tag) as they are managed differently</p>
      <b>Unreserve</b> will remove the lobby reservation which allows others to join a 5+ game before the reservation is automatically removed (so when people are still loading in)
    </div>
  </div>
</div>
</template>

<script setup lang="ts">
import { request } from '@/js/util';
import { ref, computed, onBeforeMount, onDeactivated, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const REFRESH_SECONDS = 6
const REFRESH_INTERVAL = 1000 * REFRESH_SECONDS

let servers = ref<any[]>([])
let shiftPressed = ref(false)
let message = ref<{content?: string, type?: string}>()
let selectedServer = ref()

let starting = ref<Record<string, boolean>>({})
let refreshTimer = ref<any>()
let secondsTimer = ref<any>()
let lastRefresh = ref<number | undefined>(0)

function sendMessage(type: string, content: string) {
  message.value = {
    type: type === "error" ? "has-text-danger" : type === "success" ? "has-text-success" : type,
    content: content
  }
  setTimeout(() => message.value = undefined, 8000)
}
function processAction(server: any, type: string) {
  if(type === "start") {
    starting.value[server.meta.port] = true
    setTimeout(() => {
      starting.value[server.meta.port] = false
    }, 1000 * 30)
  }
  fetch(`/api/servers/${server.id}/${type}`, {
    method: 'POST',
    credentials: 'include'
  })
  .then(async(response) => {
    if(response.ok ) {
      // there is no json body:
      if(response.status === 204) {
        sendMessage('success', `Action ${type} completed succesfully`)
        return
      }

      const json = await response.json()
      if(json.error) {
        return sendMessage('error', `<b>Server returned error</b><br>${json.message}`)
      }
      if(json.response.includes("players online")) {
        sendMessage('error', 'Cannot restart server: There are players online')
      }else{
        sendMessage('success', json.response)
      }
    }else{
      sendMessage('error', `<b>Server returned error</b><br>${response.statusText}`)
    }
  })
  .catch(err => {
    sendMessage('error', `${err.message}`)
  })
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
function getServerMessage(server: any) {
  if(server.status.online) return server.status.data.players.list == 0 ? 'Server is currently online & empty. Click to join' : 'Server has players online. Click to join.'
  else return 'Server is offline or unreachable'
  //
  return
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
  document.onkeydown = (e) => {
    shiftPressed.value = !!e.shiftKey
  }
  document.onkeyup = (e) => {
    shiftPressed.value = !!e.shiftKey
  }
})
</script>

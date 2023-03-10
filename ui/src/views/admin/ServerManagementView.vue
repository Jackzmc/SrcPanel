<template>
<div class="container">
  <div class="columns">
    <div class="column is-8">
      <p :class='message.type' v-if="message" v-html="message.content"></p>

      <table class="table is-fullwidth">
          <thead>
              <tr>
                  <th style="width:0"></th>
                  <th>Name</th>
                  <th>Players</th>
                  <th>Actions</th>
              </tr>
          </thead>
          <tbody>
            <template v-for="server in servers" :key="server.id">
              <tr>
                <td>
                  <div class="buttons">
                    <a class="button is-info" @click='selectServer(server)'>View</a>
                  </div>
                </td>
                <td class="is-size-5">
                  <a :href="'steam://connect/' + server.domain + ':' + server.port">
                    <b :data-tooltip="getServerMessage(server)" :class="getServerClasses(server)" >{{server.name}}</b>
                  </a>
                  <span v-if="server.tags.includes('5+')" class='is-size-5'><b>**</b></span>
                      <span v-if="server.tags.includes('customs')" class='is-size-5'><b>*</b></span>
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
      <em>* Server supports custom maps</em><br>
      <em>** Server supports 5+ players</em><br>
      <em>*** Server supports custom maps AND 5+ players</em>
    </div>
    <div class="column">
      <b>Request Restart</b> will restart the server if its empty
      <br>
      <b>Force Restart</b> requires you to hold SHIFT to select, and will force restart even if people are playing
      <br>
      <b>Update</b> will run an update script to update the server. This will take a while, server will not auto restart.
      <p>Updating does not show any progress, just have to wait and hope its updated.</p>
      <b>Start</b> will start the service if the server is currently not running. Check in 1-2 minutes to see if the server goes online.
      <p>Improved and vanilla do not support this, as they are managed differently</p>
      <b>Unreserve</b> will remove the lobby reservation which allows others to join a 5+ game before the reservation is automatically removed (so when people are still loading in)
    </div>
  </div>
</div>
</template>

<script setup lang="ts">
import { request } from '@/js/util';
import { ref, watch, computed, onBeforeMount, onMounted, onDeactivated } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

const emit = defineEmits(['refresh'])

let servers = ref<any[]>([])
let shiftPressed = ref(false)
let message = ref<{content?: string, type?: string}>()
let selectedServer = ref()

let starting = ref<Record<string, boolean>>({})
let refreshTimer = ref<number>()

function selectServer(server: any) {
  router.push({
    name: 'admin-server-view',
    params: {
      id: server.id
    }
  })
}
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
async function refreshServers() {
  emit('refresh', 'start')
  const response = await request('/api/servers')
  if(response?.ok) {
    servers.value = await response.json()
  }

  fetch('/api/servers')
  .then(response => {
    if(response.ok) return response.json()
    else console.error('Failure getting servers', response)
  })
  .then(json => {
    servers.value = json
  })
  .finally(() => {
    emit('refresh', 'stop')
  })
}

onDeactivated(() => {
  clearInterval(refreshTimer.value)
})

onBeforeMount(() => {
  refreshServers()
  document.onkeydown = (e) => {
    shiftPressed.value = !!e.shiftKey
  }
  document.onkeyup = (e) => {
    shiftPressed.value = !!e.shiftKey
  }
})
</script>

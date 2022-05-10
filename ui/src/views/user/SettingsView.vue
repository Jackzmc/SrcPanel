<template>
<div class="container" style="width:50%" v-if="userdata">
  <div class="mb-6" >
    <div class="columns">
      <div class="column is-8">
        <h4 class="title is-4">Info</h4>
        <p class="is-6"><b>Immunity Level: </b> {{privUser.immunityLevel}}</p>
        <p class="is-6"><b>Web Role: </b> {{webRole}}</p>
        <p class="is-6"><b>Web Flags: </b> {{webPerms}}</p>
      </div>
      <div class="column" v-if="privUser.hasWebPerm(WebPermission.FullPermission)">
        <h4 class="title is-4">Admin Panel Control</h4>
        <p><b>State: </b> {{ serverHealth.currentState }}</p>
        <p><b>Uptime: </b> {{ Math.round(serverHealth.uptime / 60) }} minutes</p>
        <p><b>Node.JS Version: </b> {{serverHealth?.versions?.node}}</p>
        <br>
        <a :disabled="updateStatus.state !== 'ACTIVE'" :class="['button', {'is-loading': updateStatus.state === 'CHECKING'}]" @click="updateServer">Update Server</a>
        <p class="has-text-danger" v-if="updateStatus.error">{{updateStatus.error}}</p>
        <p class="has-text-info" v-else-if="updateStatus.upToDate">Server is already up to date.</p>
        <p class="has-text-success" v-else-if="updateStatus.state === 'SUCCESS'">Server has been updated successfully.</p>
      </div>
    </div>
  </div>
  <div class="mb-6" >
    <h4 class="title is-4">Preferences</h4>
  </div>
  <div>
    <h4 class="title is-4">Active Sessions</h4>
    <table class="table is-table is-striped is-hoverable  is-fullwidth">
      <thead>
        <tr>
          <th>Country</th>
          <th>IP</th>
          <th>Created</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(session, i) in sessions" :key="session.id">
          <td>{{formatCountry(session.countryCode)}}</td>
          <td>{{session.ip}}</td>
          <td>{{formatTime(session.lastLogin)}}</td>
          <td>
            <b v-if="currentSessionId == session.id">Current Session</b>
            <button v-else class="button is-danger" @click="revokeSession(session.id, i)">Revoke</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
</template>

<script setup lang="ts">
import { PrivilegedUser } from '@/js/User';
import { Session, WebPermission, WEB_FLAGS } from '../../../../common-types/User';
import { onBeforeMount } from 'vue';
import { computed, ref } from 'vue';
import { HealthReport } from '../../../../server/src/routes/!!privileged/admin';

const emit = defineEmits(['close'])
const POLL_SERVER_HEALTH_INTERVAL = 1000 * 60 * 0.5

interface SessionQuery extends Session {
  id: number,
  lastLogin: number
}

const intl = new Intl.DisplayNames(['en'], {type: 'region'})
const props = defineProps<{
  userdata: Session
}>()
const privUser = new PrivilegedUser(props.userdata)

let serverHealth = ref<Partial<HealthReport>>({})
let sessions = ref<SessionQuery[]>([])
let currentSessionId = ref<number>()
let updateStatus = ref<{
  state: string,
  error?: string,
  upToDate?: boolean
}>({
  state: "ACTIVE",
})

const webPerms = computed(() => {
  if(!privUser) return ''
  const perms = []
  for(const webPerm in WEB_FLAGS) {
    if(privUser.hasWebPerm(Number(webPerm) as WebPermission)) {
      perms.push(WEB_FLAGS[webPerm])
    }
  }
  return perms.join(", ")
})
const webRole = computed(() => {
  if(!privUser) return ''
  switch(privUser.webRole as number) {
    case 0: return "None (you shouldnt be here)"
    case 1: return "Read only"
    case 2: return "Read/Write"
    case 3: return "Admin"
    case 255: return "Super Admin"
    default: return "Unknown / Invalid"
  }
})

async function updateServer() {
  updateStatus.value = {
    state: "CHECKING"
  }
  const response = await fetch('/api/admin/update')
  const json = await response.json()
  if(response.ok) {
    updateStatus.value.state = "SUCCESS"
    if(!json.success) {
      updateStatus.value.upToDate = true
    }
  } else {
    updateStatus.value.error = json.error
  }
  setTimeout(() => {
    updateStatus.value = {
      state: "ACTIVE"
    }
  }, 1000 * 5)
}

function close() {
  emit('close')
}
async function fetchSessions() {
  const response = await fetch('/api/auth/sessions')
  if(response.ok) {
    const json = await response.json()
    currentSessionId.value = json.currentSessionId
    sessions.value = json.sessions
  }
}
async function revokeSession(id: number, i: number) {
  const response = await fetch(`/api/auth/sessions/${id}`, { method: 'DELETE' })
  if(response.status == 204) {
    sessions.value.splice(i, 1)
  } else {
    alert('Failed to revoke session: ' + (await response.json()).message)
  }
}
function formatTime(s: number) {
  const d = new Date(s)
  return d.toLocaleString()
}
function formatCountry(code: string) {
  return intl.of(code)
}

async function fetchServerHealth() {
  const response = await fetch('/api/admin/health')
  if(response.ok) {
    serverHealth.value = await response.json()
  }
}

onBeforeMount(() => {
  fetchSessions()
  if(privUser.hasWebPerm(WebPermission.FullPermission)) {
    setInterval(fetchServerHealth, POLL_SERVER_HEALTH_INTERVAL)
  }
})
</script>

<template>
<div class="container" style="width:60%" v-if="userdata">
  <div class="mb-6" >
    <div class="columns">
      <div class="column is-8 content">
        <nav class="level">
          <div class="level-item has-text-centered">
            <div>
              <p class="heading">
                Web Role
                  <span class="tag" data-tooltip="This is a legacy permission system and will be removed soon">Legacy</span>
              </p>
              <p class="title">{{ webRole }} </p>
            </div>
          </div>
          <div class="level-item has-text-centered" data-tooltip="This determines how high your permission is. Admins with a level below you cannot affect you">
            <div>
              <p class="heading">
              Immunity Level
              <span class="tag" data-tooltip="This is a legacy permission system and will be removed soon">Legacy</span>
              </p>
              <p class="title">{{ privUser.immunityLevel }}</p>
            </div>
          </div>
        </nav>
        <div class="columns">
          <div class="column">
            <div data-tooltip="These are the permissions you have on this admin panel">
              <p class="is-6"><b>Access Permissions: <span class="tag" data-tooltip="This is a legacy permission system and will be removed soon">Legacy</span></b></p>
              <ul>
                <li v-for="perm in webPerms" :key="perm">
                  {{ perm }}
                </li>
              </ul>
            </div>
          </div>
          <div class="column">
            <div>
              <p class="is-6"><b>Privileges: </b></p>
              <table class="table">
                <thead>
                  <tr>
                    <th>Service</th>
                    <th>Privilege</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(priv, service) in privUser.privileges" :key="service">
                    <td>{{ service }}</td>
                    <td>{{ formatPrivilege(priv!) }}</td>
                  </tr>
                </tbody>
              </table>
              <p v-if="Object.keys(privUser.privileges).length == 0" class="my-5">
                <em>You have no privileges :(</em>
              </p>
            </div>
          </div>
        </div>
      </div>
      <div class="column" v-if="privUser.hasWebPerm(WebPermission.FullPermission)">
        <h4 class="title is-4">Admin Panel Control</h4>
        <p>{{ serverHealth.currentState }}</p>
        <p>{{ uptime }} uptime</p>
        <p>Node.JS Version {{serverHealth?.versions?.node}}</p>
        <br>
        <a
          :disabled="canUpdate"
          :class="['button', {'is-loading': updateStatus.state === 'CHECKING'}]"
          @click="updateServer"
        >Update Server</a>
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
          <th>Session ID</th>
          <th>Country</th>
          <th>IP</th>
          <th>Created</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(session, i) in sessions" :key="session.id">
          <td>{{ session.id.substring(0, 8) }}</td>
          <td v-if="session.ip != '127.0.0.1'">{{formatCountry(session.countryCode)}}</td>
          <td v-else><em>(dev)</em></td>
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
import { SessionData, WebPermission, WEB_FLAGS } from '../../../../common-types/User';
import { onBeforeMount } from 'vue';
import { computed, ref } from 'vue';
import { HealthReport, UpdateState } from '../../../../server/src/routes/!!privileged/admin';
import { ServicePrivilege, UserPrivileges, ServicePrivilegeKeys } from '../../../../common-types/Privileges';

const emit = defineEmits(['close'])
const POLL_SERVER_HEALTH_INTERVAL = 1000 * 60 * 0.5

interface SessionQuery extends SessionData {
  id: string,
  lastLogin: number,
  privileges: UserPrivileges
}

const intl = new Intl.DisplayNames(['en'], {type: 'region'})
const props = defineProps<{
  userdata: SessionData
}>()
const privUser = new PrivilegedUser(props.userdata)

let serverHealth = ref<Partial<HealthReport>>({})
let sessions = ref<SessionQuery[]>([])
let currentSessionId = ref<string>()
let updateStatus = ref<{
  state: UpdateState | "CHECKING" | "SUCCESS",
  error?: string,
  upToDate?: boolean
}>({
  state: "NORMAL",
})

const canUpdate = computed(() => {
  return updateStatus.value.state !== "NORMAL" || undefined
})
const uptime = computed(() => {
  const minutes = (serverHealth.value.uptime ?? 0) / 60
  if(minutes < 1.0) return "< 1 minute"
  else if(minutes > 60.0) {
    const hours = minutes / 60
    if(hours > 24) return `${Math.round(hours / 24)} days`
    else return `${hours.toFixed(1)} hours`
  }
  else return `${minutes.toFixed(1)} minutes`
})

const webPerms = computed(() => {
  if(!privUser) return ''
  const perms = []
  for(const webPerm in WEB_FLAGS) {
    if(privUser.hasWebPerm(Number(webPerm) as WebPermission)) {
      perms.push(WEB_FLAGS[webPerm])
    }
  }
  return perms
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
    updateStatus.value.error = json.message
  }
  setTimeout(() => {
    updateStatus.value = {
      state: "NORMAL"
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
async function revokeSession(id: string, i: number) {
  const response = await fetch(`/api/auth/sessions/${id}`, { method: 'DELETE' })
  if(response.status == 204) {
    sessions.value.splice(i, 1)
  } else {
    alert('Failed to revoke session: ' + (await response.json()).message)
  }
}
function formatPrivilege(privilege: ServicePrivilege) {
  return ServicePrivilegeKeys[privilege] ?? "Invalid"
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
    fetchServerHealth()
    setInterval(fetchServerHealth, POLL_SERVER_HEALTH_INTERVAL)
  }
})
</script>

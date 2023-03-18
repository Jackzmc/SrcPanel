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
        </div>
      </div>
    </div>
  </div>
  <div class="mb-6" >
    <h4 class="title is-4">Preferences</h4>
    <em class=" my-6">There's nothing here.</em>
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
          <td v-if="session.ip !== '127.0.0.1'">{{formatCountry(session.countryCode)}}</td>
          <td v-else><em>(dev)</em></td>
          <td>{{session.ip}}</td>
          <td>{{formatTime(session.lastLogin)}}</td>
          <td>
            <b v-if="currentSessionId === session.id">Current Session</b>
            <button v-else class="button is-danger is-small" @click="revokeSession(session.id, i)">Revoke</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
</template>

<script setup lang="ts">
import { PrivilegedUser } from '@/js/User';
import { SessionData, UserData, WebPermission, WEB_FLAGS } from '../../../../common-types/User';
import { onBeforeMount } from 'vue';
import { computed, ref } from 'vue';
import { HealthReport, UpdateState } from '../../../../server/src/routes/!!privileged/admin';
import { ServicePrivilege, UserPrivileges, ServicePrivilegeKeys } from '../../../../common-types/Privileges';
import { request } from '@/js/util';
import { notify } from '@kyvg/vue3-notification';

const emit = defineEmits(['close'])

interface SessionQuery extends UserData {
  id: string,
  countryCode: string,
  ip: string,
  lastLogin: number,
  privileges: UserPrivileges
}

const intl = new Intl.DisplayNames(['en'], {type: 'region'})
const props = defineProps<{
  userdata: UserData
}>()
const privUser = new PrivilegedUser(props.userdata)

let sessions = ref<SessionQuery[]>([])
let currentSessionId = ref<string>()

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

async function fetchSessions() {
  const response = await request('/api/auth/sessions')
  if(response?.ok) {
    const json = await response.json()
    currentSessionId.value = json.currentSessionId
    sessions.value = json.sessions
  }
}
async function revokeSession(id: string, i: number) {
  const response = await request(`/api/auth/sessions/${id}`, { method: 'DELETE' }, { title: "Revoking Session"})
  if(response?.status == 204) {
    sessions.value.splice(i, 1)
  }
}
function formatTime(s: number) {
  const d = new Date(s)
  return d.toLocaleString()
}
function formatCountry(code: string) {
  return intl.of(code)
}



onBeforeMount(() => {
  fetchSessions()
})
</script>

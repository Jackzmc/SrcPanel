<template>
  <div class="modal is-active">
    <div class="modal-background"></div>
    <div class="modal-card">
      <header class="modal-card-head">
        <p class="modal-card-title" v-if="user"><b>{{user.name}}</b> <span class="is-pulled-right">{{user.steamid}}</span></p>
        <p v-else>Loading...</p>
        &nbsp;&nbsp;
      </header>
      <section class="modal-card-body" v-if="user">
        <div class="field">
          <label class="label">Playtime</label>
          <span>
            <p v-if="stats">{{playtime}} hours</p>
            <em v-else>(no recorded statistics found)</em>
            <p class="help has-text-danger" v-if="hoursPlayed < MIN_HOURS_PLAYTIME">Does not meet the minimum amount of {{MIN_HOURS_PLAYTIME}} hours played</p>
          </span>
        </div>
        <div class="field">
          <label class="label">Immunity</label>
          <div class="control">
            <input
              type="number"
              class="input"
              v-model="form.immunity"
              min="0" :max="privUser.immunityLevel - 1"
            />
          </div>
          <p class="help has-text-danger" v-if="form.immunity >= privUser.immunityLevel">The maximum immunity level you can apply is {{userdata.permissions.immunityLevel - 1}}</p>
        </div>
        <div class="tabs">
          <ul>
            <li :class="{'is-active': tabIndex == 1}" @click="setTab(1)"><a>Permission Groups</a></li>
            <li :class="{'is-active': tabIndex == 0}" @click="setTab(0)"><a>Manual Flags</a></li>
          </ul>
        </div>
        <template v-if="tabIndex == 0">
          <h6 class="title is-6">Flags</h6>
          <p class="subtitle is-6">Only flags you have access to can be added</p>
          <div class="field">
            <input
              id="z"
              type="checkbox"
              value="z"
              class="is-checkradio"
              v-model="form.flags"
              disabled
              data-tooltip="Only superadmins have permission to add other root users"
            >
            <label>Root (All Permissions)</label>
          </div>
          <div class="field" v-for="(name, flag) in FLAGS" :key="flag">
            <input
              :id="flag"
              type="checkbox"
              :value="flag"
              class="is-checkradio has-tooltip-right"
              v-model="form.flags"
              :disabled="!hasRoot && privUser.flags.indexOf(flag) === -1"
            >
            <label :for="flag">{{name}}</label>
          </div>
        </template>
        <template v-else-if="tabIndex == 1">
          <table class="table is-fullwidth">
            <thead>
              <tr>
                <th></th>
                <th>Name</th>
                <th>Flags</th>
                <th>Immunity Level</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="group in groups" :key="group.id">
                <tr>
                  <td>
                    <a @click="expandGroup(group.id)" class="button is-small">
                      <template v-if="expandedGroup?.id == group.id">⮟</template>
                      <template v-else>⮞</template>
                    </a>
                    &nbsp;
                    <input
                      :id="'group.'+group.id.toString()"
                      type="checkbox"
                      :value="group.id"
                      class="is-checkradio is-medium is-info"
                      v-model="selectedGroups"
                    >
                    <label :for="'group.'+group.id.toString()"></label>
                  </td>
                  <td>{{group.name}}</td>
                  <td>{{group.flags}}</td>
                  <td>{{group.immunityLevel}}</td>
                </tr>
                <tr v-if="expandedGroup?.id == group.id" style="width:100%">
                  <td colspan="4">
                    <FlagList :userdata="userdata" :flags="group.flags" only-active />
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </template>
        <article class="message is-warning" v-if="noPermsGiven">
          <div class="message-body">
            <b>Warning: </b>User has not been granted any permissions.
            Apply a group or manually apply flags.
          </div>
        </article>
      </section>
      <footer class="modal-card-foot">
        <button
          :class="['button','has-tooltip-top', 'is-success',{'is-loading': !user}]"
          :disabled="cantAddAdmin"
          @click="save"
        >Add Admin</button>
        <button :class="['button',{'is-loading': !user}]" @click="cancel">Cancel</button>
        <p class="has-text-danger" v-if="error">{{error}}</p>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { User, PrivilegedUser, PlayerData } from '@/js/User'
import { useRouter, useRoute } from 'vue-router'
import SteamID from 'steamid'
import { Session, WebPermission, WebRole } from '../../../../common-types/User';
import { AdminGroup } from '../../../../server/src/routes/!!privileged/admins';
import FlagList from '@/components/FlagList.vue'

const MIN_HOURS_PLAYTIME = 10
const FLAGS = {
  'a': 'Reserved Slot',
  'b': 'Generic Admin',
  'c': 'Kick',
  'd': 'Ban',
  'e': 'Unban',
  'f': 'Slay/harm others',
  'g': 'Change the map',
  'h': 'Change cvar rules',
  'i': 'Execute custom config files',
  'j': 'Use admin chat',
  'k': 'Start a generic vote',
  // 'l': 'Set a password on the server',
  'm': 'Ingame rcon access',
  'n': 'Enable sv_cheats or use cheat commands',
  'o': 'Custom 1',
  'p': 'Custom 2',
  'q': 'Custom 3',
  'r': 'Custom 4',
  's': 'Custom 5',
  't': 'Custom 6',
}

const router = useRouter()
const route = useRoute()
const props = defineProps<{
  userdata: Session
}>()
const privUser = new PrivilegedUser(props.userdata)

let user = ref<PlayerData|null>()
let groups = ref<AdminGroup[]>([])
let tabIndex = ref(1)
let form = ref({
  immunity: 0,
  flags: [],
})
let stats = ref<Record<string, string|number>|null>()
let error = ref("")
let loading = ref(false)
let expandedGroup = ref<AdminGroup>()
let selectedGroups = ref<AdminGroup[]>([])

const hasRoot = computed(() => {
  return privUser.flags?.includes('z')
})
const hoursPlayed = computed(() => {
  if(!stats) return 0
  return Math.round(stats.value?.minutes_played as number / 60)
})
const playtime = computed(() => {
  if(!stats) return
  if(hoursPlayed.value > 0) return hoursPlayed
  return "< 0"
})
const noAddReasons = computed(() => {
  const msgs = []
  if(hoursPlayed.value < MIN_HOURS_PLAYTIME) {
    msgs.push(`A minimum of ${MIN_HOURS_PLAYTIME} hours of playtime is required.`)
  }
  return msgs
})
const cantAddAdmin = computed(() => {
  return noAddReasons.value.length > 0
})

const noPermsGiven = computed(() => {
  return form.value.flags.length === 0 && selectedGroups.value.length === 0
})


function setTab(index: number) {
  tabIndex.value = index
}
function expandGroup(id: number) {
  if(expandedGroup.value?.id === id)
    expandedGroup.value = undefined
  else
    expandedGroup.value = groups.value.find(group => group.id === id)
}

interface POSTAdminAPI {
  immunityLevel: number,
  flags: string,
  groupsIds: string,
  webPermissions: number
}
async function save() {
  if(cantAddAdmin.value) {
    alert(`Cannot add admin for the following reasons:\n* ${noAddReasons.value.join('\n *')}`)
  } else {
    loading.value = true
    const response = await fetch(`/api/admins/${user.value?.steamid}`, {
      method: 'POST',
      body: JSON.stringify({
        immunityLevel: form.value.immunity,
        flags: form.value.flags.join(''),
        groupsIds: selectedGroups.value.map(group => group.id).join(','),
        webPermissions: 0,
        name: user.value?.name
      } as POSTAdminAPI)
    })
    loading.value = false
    if(response.ok) {
      alert("Success")
      router.push('/admin/players')
    } else {
      error.value = `${response.statusText} ${(await response.json()).message}`
    }
  }
}

function cancel() {
  router.push('/admin/players')
}

async function getGroups(): Promise<AdminGroup[]> {
  const res = await fetch('/api/admins/groups')
  if(res.ok) {
    return (await res.json()).groups
  } else {
    return []
  }
}

onMounted(async() => {
  user.value = await User.fetch(route.params.id as string)
  stats.value = await User.getStats(route.params.id as string)
  groups.value = await getGroups()
})
</script>

<template>
  <div class="modal is-active">
    <div class="modal-background"></div>
    <div class="modal-card">
      <header class="modal-card-head">
        <p class="modal-card-title" v-if="user"><b>{{user.name}}</b> <span class="is-pulled-right">{{user.steamid}}</span></p>
        <p v-else>Loading...</p>
        &nbsp;&nbsp;
      </header>
      <section class="modal-card-body" v-if="stats">
        <p class="has-text-centered my-5" v-if="loading.stats">Fetching player statistics...</p>
        <div class="level" v-else>
          <div class="level-item has-text-centered">
            <div class="field">
              <label class="label">Playtime</label>
              <span>
                <p v-if="stats">{{playtime}} hours</p>
                <em v-else>(no recorded statistics found)</em>
                <p class="help has-text-danger" v-if="hoursPlayed < MIN_HOURS_PLAYTIME">Does not meet the minimum amount of {{MIN_HOURS_PLAYTIME}} hours played</p>
              </span>
            </div>
          </div>
          <div class="level-item has-text-centered">
            <div class="field">
              <label class="label">First Joined</label>
              <span>
                <p v-if="stats">
                  <template v-if="stats.created_date">{{formatTime(stats.created_date)}}</template>
                  <em v-else>unknown</em>
                </p>
                <em v-else>(no recorded statistics found)</em>
              </span>
            </div>
          </div>
          <div class="level-item has-text-centered">
            <div class="field">
              <label class="label">Last Joined</label>
              <span>
                <p v-if="stats">
                  <template v-if="stats.last_join_date">{{formatTime(stats.last_join_date)}}</template>
                  <em v-else>never</em>
                </p>
                <em v-else>(no recorded statistics found)</em>
              </span>
            </div>
          </div>
          <div class="level-item has-text-centered">
            <div class="field">
              <label class="label has-tooltip-left" data-tooltip="The percentage of friendly fire compared to damage dealt">FF %</label>
              <span>
                <p v-if="stats">
                  {{(stats.survivor_ff / stats.survivor_damage_give * 100).toFixed(1)}}
                </p>
                <em v-else>(no recorded statistics found)</em>
              </span>
            </div>
          </div>
        </div>
        <div class="level" v-if="adminData">
          <div class="level-item has-text-centered">
            <div class="field">
              <label class="label">Admin Id</label>
              <span>
                {{adminData?.id}}
              </span>
            </div>
          </div>
          <div class="level-item has-text-centered">
            <div class="field">
              <label class="label">Immunity</label>
              <span>
                {{adminData?.permissions.immunityLevel || 0}}
              </span>
            </div>
          </div>
          <div class="level-item has-text-centered">
            <div class="field">
              <label class="label">Flags</label>
              <span v-if="adminData?.permissions.flags.length > 0">
                {{adminData?.permissions.flags}}
              </span>
              <em v-else>(none)</em>
            </div>
          </div>
        </div>
        <Tabs inner-wrapper-class="tabs" :options="{useUrlFragment:false}">
           <Tab name="Admin Groups">
            <p class="has-text-centered my-5" v-if="loading.groups">Fetching available admin groups... Please wait</p>
            <table class="table" v-else>
              <thead>
                <tr>
                  <th style="width:8em"></th>
                  <th>Name</th>
                  <th>Flags</th>
                  <th>Immunity Level</th>
                </tr>
              </thead>
              <tbody>
                <template v-for="group in groups" :key="group.id">
                  <tr>
                    <td>
                      <a @click="expandGroup(group.id)" class="button is-small" data-tooltip="View group flags">
                        <template v-if="expandedGroup?.id == group.id">⮟</template>
                        <template v-else>⮞</template>
                      </a>
                      &nbsp;
                      <input
                        :id="'group.'+group.id.toString()"
                        type="checkbox"
                        :value="group.id"
                        class="is-checkradio is-medium is-info"
                        :disabled="!canEdit"
                        v-model="selectedGroupsIds"
                      >
                      <label :for="'group.'+group.id.toString()"></label>
                    </td>
                    <td>{{group.name}}</td>
                    <td>{{group.flags}}</td>
                    <td>{{group.immunity}}</td>
                  </tr>
                  <tr v-if="expandedGroup?.id == group.id" style="width:100%">
                    <td colspan="4">
                      <FlagList :userdata="userdata" :flags="group.flags" only-active />
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </Tab>
          <Tab name="Base Permissions">
            <div class="field">
              <label class="label">Base Immunity</label>
              <div class="control">
                <input
                  type="number"
                  class="input"
                  v-model="form.immunity"
                  min="0" :max="privUser.immunityLevel - 1"
                />
              </div>
              <p class="help has-text-danger" v-if="form.immunity >= privUser.immunityLevel">The maximum immunity level you can apply is {{userdata.permissions.immunityLevel - 1}}, which is below yours ({{userdata.permissions.immunityLevel}})</p>
            </div>
            <h6 class="title is-6">Base Flags</h6>
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
                :disabled="!canEdit || !hasRoot && privUser.flags.indexOf(flag) === -1"
              >
              <label :for="flag">{{name}}</label>
            </div>
          </Tab>
          <Tab name="Web">
            <h6 class="title is-6">Web Permissions</h6>
            <p class="subtitle is-6">Only permissions you have access to can be added</p>
            <div class="field" v-for="(name, flag) in WEB_FLAGS" :key="flag">
              <input
                :id="'flag.' + flag"
                type="checkbox"
                :value="flag"
                class="is-checkradio has-tooltip-right"
                v-model="form.webFlags"
                :disabled="!canEdit || !hasRoot && !privUser.hasWebPerm(flag)"
              >
              <label :for="'flag.' + flag">{{name}}</label>
            </div>
          </Tab>
        </Tabs>
        <article class="message is-warning" v-if="noPermsGiven">
          <div class="message-body">
            <b>Warning: </b>User has not been granted any permissions.
            Apply a group or manually apply flags.
          </div>
        </article>
      </section>
      <footer class="modal-card-foot">
        <template v-if="canEdit">
          <button
            :class="['button','has-tooltip-top', 'is-success',{'is-loading': !user}]"
            :disabled="cantAddAdmin"
            @click="save"
          >Save</button>
          <button :class="['button',{'is-loading': !user}]" @click="cancel">Cancel</button>
        </template>
        <template v-else>
          <button class="button" @click="cancel">Close</button>
          <p class="has-text-danger">User is immune to you, you cannot edit.</p>
        </template>
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
import { Session, WebPermission, WebRole, FLAGS, WEB_FLAGS, AdminData, AdminGroup } from '../../../../common-types/User';
import FlagList from '@/components/FlagList.vue'
import { convertBitsArrayToInt, convertIntToBitsArray, } from '../../js/User';
// @ts-ignore
import { Tab, Tabs } from 'vue3-tabs-component'


const MIN_HOURS_PLAYTIME = 10
const router = useRouter()
const route = useRoute()
const props = defineProps<{
  userdata: Session
}>()
const privUser = new PrivilegedUser(props.userdata)

let user = ref<PlayerData|null>()
let adminData = ref<AdminData|null>()
let groups = ref<AdminGroup[]>([])
// let tabIndex = ref<Tab>(Tab.Groups)
let form = ref<{
  immunity: number,
  flags: string[],
  webFlags: number[]
}>({
  immunity: 0,
  flags: [],
  webFlags: []
})
let stats = ref<Record<string, string|number>|null>()
let error = ref("")
let loading = ref({
  stats: true,
  groups: true
})
let expandedGroup = ref<AdminGroup>()
let selectedGroupsIds = ref<number[]>([])

const canEdit = computed(() => {
  if(adminData.value && form.value.immunity >= privUser.immunityLevel) return false
  return true
})

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
  return noAddReasons.value.length > 0 || !canEdit.value
})

const noPermsGiven = computed(() => {
  return form.value.flags.length === 0 && selectedGroupsIds.value.length === 0 && form.value.webFlags.length === 0
})


function formatTime(time: number) {
  const date = new Date(time*1000)
  return date.toLocaleDateString()
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
  error.value = ''
  if(cantAddAdmin.value) {
    alert(`Cannot add admin for the following reasons:\n* ${noAddReasons.value.join('\n *')}`)
  } else {
    const response = await fetch(`/api/admins/${user.value?.steamid}`, {
      method: adminData.value ? 'PUT': 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        immunityLevel: form.value.immunity,
        flags: form.value.flags.join(''),
        groupsIds: selectedGroupsIds.value.join(','),
        webPermissions: convertBitsArrayToInt(form.value.webFlags),
        name: user.value?.name
      } as POSTAdminAPI)
    })
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
  loading.value.groups = true
  const res = await fetch('/api/admins/groups')
  loading.value.groups = false
  if(res.ok) {
    return (await res.json()).groups
  } else {
    return []
  }
}

onMounted(async() => {
  const player = await User.fetch(route.params.id as string, true)
  user.value = player?.user
  if(player?.adminData) {
    adminData.value = player.adminData
    form.value.flags = player.adminData.permissions.base.flags?.split("") || []
    form.value.webFlags = convertIntToBitsArray(player.adminData.permissions.web.flags || 0)
    form.value.immunity = player.adminData.permissions.base.immunityLevel || 0
    selectedGroupsIds.value = player.adminData.groups?.map(group => group.id) || []
  }

  loading.value.stats = true
  stats.value = await User.getStats(route.params.id as string)
  loading.value.stats = false

  groups.value = await getGroups()
})
</script>

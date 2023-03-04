<template>
<section>
  <div class="level">
    <div class="level-item has-text-centered" v-if="loading.stats">
      <div class="field">
        <label class="label">Loading Player Statistics</label>
        <img src="@/assets/loader.gif" style="height:64px" />
      </div>
    </div>
    <template v-else>
    <div class="level-item has-text-centered">
      <div class="field">
        <label class="label">Playtime</label>
        <span>
          <p v-if="stats">
            {{playtime}} hours
            <b
              v-if="hoursPlayed < MIN_HOURS_PLAYTIME"
              class="has-text-danger has-tooltip-right has-tooltip-danger"
              :data-tooltip="POLICY_MSG_MIN_HOURS_OF_PLAYTIME"
            >(!) </b>
          </p>
          <em v-else>(no recorded statistics found)</em>
        </span>
      </div>
    </div>
    <div class="level-item has-text-centered">
      <div class="field">
        <label class="label">First Joined</label>
        <span>
          <template v-if="stats">
            <p v-if="stats.created_date">
              {{formatTime(stats.created_date)}}
            </p>
            <em v-else>never</em>
            <p>{{ getRelDate(Number(stats.created_date)) }}</p>
          </template>
          <em v-else>(no recorded statistics found)</em>
        </span>
      </div>
    </div>
    <div class="level-item has-text-centered">
      <div class="field">
        <label class="label">Last Online</label>
        <span>
          <template v-if="stats">
            <p v-if="stats.last_join_date">
              {{formatTime(stats.last_join_date)}}
            </p>
            <em v-else>never</em>
            <p>{{ getRelDate(Number(stats.last_join_date)) }}</p>
          </template>
          <em v-else>(no recorded statistics found)</em>
        </span>
      </div>
    </div>
    <div class="level-item has-text-centered">
      <div class="field">
        <label class="label has-tooltip-left" data-tooltip="The percentage of friendly fire compared to damage dealt">FF %</label>
        <span>
          <p v-if="stats">
            {{(stats.survivor_ff as number / (stats.survivor_damage_give as number) * 100).toFixed(1)}}
          </p>
          <em v-else>(no recorded statistics found)</em>
        </span>
      </div>
    </div>
    </template>
  </div>
  <div class="level" v-if="userAdminData">
    <div class="level-item has-text-centered">
      <div class="field">
        <label class="label">Admin Id</label>
        <span>
          {{userAdminData.id}}
        </span>
      </div>
    </div>
    <div class="level-item has-text-centered">
      <div class="field">
        <label class="label">Immunity</label>
        <span>
          {{userAdminData.permissions.immunityLevel || 0}}
        </span>
      </div>
    </div>
    <div class="level-item has-text-centered">
      <div class="field">
        <label class="label">Flags</label>
        <span v-if="userAdminData.permissions.flags.length > 0">
          {{userAdminData.permissions.flags}}
        </span>
        <em v-else>(none)</em>
      </div>
    </div>
  </div>
  <Tabs inner-wrapper-class="tabs" :options="{useUrlFragment:false}">
      <Tab name="Admin Groups">
      <div class="has-text-centered" v-if="loading.groups">
        <p>Fetching admin groups...</p>
        <img src="@/assets/loader.gif" style="height:128px" />
      </div>
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
                  v-model="selectedgroupIds"
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
    <Tab name="Override Permissions">
      <div class="field">
        <label class="label">Base Immunity</label>
        <div class="control">
          <input
            type="number"
            class="input"
            v-model="form.immunity"
            min="0" :max="privUser.immunityLevel - 1"
            :disabled="!canEdit"
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
          :disabled="!hasRoot"
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
        <label :for="flag">{{name}}  <span class="tag">{{flag}}</span></label>
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
    <Tab name="Danger" v-if="userAdminData">
      <div class="field">
        <div class="control">
          <a class="button is-danger" @click='revoke'>Revoke Admin</a>
        </div>
        <p class="help has-text-danger">This will remove all admin privileges, for the web and in-game.</p>
      </div>
    </Tab>
  </Tabs>
  <br>
  <!-- TODO: Add a computed policy system -->
  <article class="message is-danger" v-if="policyFailures.length > 0">
    <div class="message-body content">
      <b>Player cannot be made an admin due to the following reasons:</b>
      <ul>
        <li v-for="policy in policyFailures" :key="policy">{{policy}}</li>
      </ul>
    </div>
  </article>
  <article class="message is-warning" v-if="noPermsGiven">
    <div class="message-body">
      <p><b>Warning: </b>No permissions has been granted to the user. The user's access will be very restricted.</p>
      <p>Apply a permission group, apply some base permissions, or some web permissions.</p>
    </div>
  </article>
  <Teleport to="#manage-user-footer">
    <button
      :class="['button','has-tooltip-top', 'is-success',{'is-loading': loading.save}]"
      :disabled="cantAddAdmin || !canEdit"
      @click="save"
    >{{ props.userAdminData ? 'Save' : 'Add Admin' }}</button>
  </Teleport>
</section>

</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { User, PrivilegedUser, PlayerData } from '@/js/User'
import { useRouter, useRoute } from 'vue-router'
import SteamID from 'steamid'
import { Session, WebPermission, WebRole, FLAGS, WEB_FLAGS, AdminData, AdminGroup } from '../../../../../common-types/User';
import FlagList from '@/components/FlagList.vue'
import { convertBitsArrayToInt, convertIntToBitsArray, } from '@/js/User';
// @ts-ignore
import { Tab, Tabs } from 'vue3-tabs-component'
import { notify } from '@kyvg/vue3-notification';
import { getRelDate } from '@/js/util';


const MIN_HOURS_PLAYTIME = 10
const POLICY_MSG_MIN_HOURS_OF_PLAYTIME = `Policy requires a minimum of ${MIN_HOURS_PLAYTIME} hours of playtime`
const router = useRouter()
const route = useRoute()
const props = defineProps<{
  userAdminData: AdminData,
  user: PlayerData,
  userdata: Session,
  privUser: PrivilegedUser
}>()

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
let fetchError = ref("")
let loading = ref({
  stats: true,
  groups: true,
  save: false
})
let expandedGroup = ref<AdminGroup>()
let selectedgroupIds = ref<number[]>([])

const canEdit = computed(() => {
  if(loading.value.save || loading.value.groups || loading.value.stats) return false
  if(props.userAdminData && form.value.immunity >= props.privUser.immunityLevel) return false
  if(policyFailures.value.length > 0) return false
  return true
})

const policyFailures = computed(() => {
  const failures: string[] = []
  if(props.userAdminData) return failures

  if(hoursPlayed.value < MIN_HOURS_PLAYTIME) failures.push(POLICY_MSG_MIN_HOURS_OF_PLAYTIME)
  if(props.user?.bansCount || 0 > 0) failures.push('Player cannot have been banned at any point.')
  return failures
})
const hasRoot = computed(() => {
  return props.privUser.flags?.includes('z')
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
  return form.value.flags.length === 0 && selectedgroupIds.value.length === 0 && form.value.webFlags.length === 0
})


function formatTime(time: number | string) {
  const date = new Date(Number(time)*1000)
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
  groupIds: string,
  webPermissions: number
}
async function revoke() {
  if(window.confirm(`Are you sure you want to revoke ${props.user?.name}'s admin privileges? They will no longer be able to use any admin commands, see admin chat, or view any administration pages online.`)) {
    const response = await fetch(`/api/admins/${props.user?.steamid}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include'
    })
    if(response.ok) {
      notify({
        type: "success",
        text: `Revoked ${props.user.name}'s admin privileges`
      })
      cancel()
    } else {
      const json = await response.json()
      notify({
        type: "error",
        title: "Revoke Admin Failed",
        text: json.message
      })
    }
  }
}
async function save() {
  error.value = '';
  if(cantAddAdmin.value) {
    alert(`Cannot add admin for the following reasons:\n* ${noAddReasons.value.join('\n *')}`)
  } else {
    loading.value.save = true;
    const response = await fetch(`/api/admins/${props.user?.steamid}`, {
      method: props.userAdminData ? 'PUT': 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        immunityLevel: form.value.immunity,
        flags: form.value.flags.join(''),
        groupIds: selectedgroupIds.value.join(','),
        webPermissions: convertBitsArrayToInt(form.value.webFlags),
        name: props.user?.name
      } as POSTAdminAPI)
    })
    if(response.ok) {
      notify({
        type: "success",
        text: "Saved admin successfully"
      })
    } else {
      const json = await response.json()
      notify({
        type: "error",
        title: "Save Admin Failed",
        text: json.message
      })
      error.value = `${response.statusText} ${json.message}`
    }
  }
  loading.value.save = false
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

async function loadData() {
  fetchError.value = ""
  error.value = ""
  if(props.userAdminData) {
    form.value.flags = props.userAdminData.permissions.base.flags?.split("") || []
    form.value.webFlags = convertIntToBitsArray(props.userAdminData.permissions.web.flags || 0)
    form.value.immunity = props.userAdminData.permissions.base.immunityLevel || 0
    selectedgroupIds.value = props.userAdminData.groups?.map(group => group.id) || []
  }
  try {
    loading.value.stats = true
    try {
      stats.value = await User.getStats(route.params.id as string)
    } catch(err) {
      console.error(`Failed to fetch statistics for user:`, err)
      error.value = (err as Error).message
    } finally {
      loading.value.stats = false
    }

    groups.value = await getGroups()
  } catch(err) {
    console.error(`Failed to fetch user information:`, err)
    fetchError.value = (err as Error).message
  }
}

onMounted(async() => {
  loadData()
})
</script>

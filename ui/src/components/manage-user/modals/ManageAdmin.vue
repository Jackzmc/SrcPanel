<template>
<section>
  <article class="message is-danger" v-if="!canEdit && props.userAdminData">
    <div class="message-body">
      <b>Editing disabled for the following reasons:</b>
      <div class="content">
        <ul>
          <li v-for="(reason, i) in noEditReasons" :key="i">
            {{ reason }}
          </li>
          <li v-for="(reason, i) in policyFailures" :key="i">
            {{ reason }}
          </li>
        </ul>
      </div>
    </div>
  </article>
  <div class="level">
    <div class="level-item has-text-centered" v-if="userAdminData">
      <div class="field">
        <label class="label">Admin Id</label>
        <span>
          {{userAdminData.id}}
        </span>
      </div>
    </div>
    <div class="level-item has-text-centered">
      <div class="field">
        <label class="label">Playtime</label>
        <span>
          <p v-if="stats">
            {{playtime}} hours
            <b
              v-if="hoursPlayed < MIN_HOURS_PLAYTIME"
              class="has-text-danger has-tooltip-bottom has-tooltip-danger"
              :data-tooltip="POLICY_MSG_MIN_HOURS_OF_PLAYTIME"
            >(!) </b>
          </p>
          <em v-else><Icon icon="fa-spinner" spin></Icon></em>
        </span>
      </div>
    </div>
    <div class="level-item has-text-centered" v-if="userAdminData">
      <div class="field">
        <label class="label" data-tooltip="You can only affect admins under your immunity level">Immunity</label>
        <span>
          {{userAdminData.permissions.immunityLevel || 0}}
        </span>
      </div>
    </div>
    <div class="level-item has-text-centered" v-if="userAdminData">
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
    <Tab name="Overview" v-if="userAdminData">
      <div class="columns">
        <div class="column">
          <h6 class="title is-6">Game Permissions</h6>
          <FlagList :priv-user="privUser" :flags="userAdminData.permissions.flags" only-active />
        </div>
        <div class="column">
          <h6 class="title is-6">Panel Permissions</h6>
          <div v-for="code in userAdminData.permissions.codes" :key="code">
            <b>{{ code }}</b>
          </div>
        </div>
      </div>
    </Tab>
    <Tab name="Groups">
      <div class="has-text-centered" v-if="loading.groups">
        <p>Fetching admin groups...</p>
        <img src="@/assets/loader.gif" style="height:128px" />
      </div>
      <table class="table is-fullwidth" v-else>
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
                <a @click="expandGroup(group.id)" class="button is-small has-tooltip-right" data-tooltip="View group flags & privileges">
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
              <td :data-tooltip="'Group #' + group.id">{{group.name}}</td>
              <td>{{group.flags}}</td>
              <td>{{group.immunity}}</td>
            </tr>
            <tr v-if="expandedGroup?.id == group.id" style="width:100%" class="has-background-light">
              <td colspan="2">
                <div class="box">
                  <h6 class="title is-6">Game Permissions</h6>
                  <FlagList :priv-user="privUser" :flags="group.flags" only-active />
                </div>
              </td>
              <td colspan="2">
                <div class="box">
                  <h6 class="title is-6">Panel Permissions</h6>
                  <div v-for="code in expandedGroup.codes" :key="code">
                    {{ code }}
                  </div>
                </div>
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
            :disabled="!canEdit"
          />
        </div>
        <p class="help has-text-danger" v-if="form.immunity >= privUser.immunityLevel">The maximum immunity level you can apply is {{privUser.immunityLevel - 1}}, which is below yours ({{privUser.immunityLevel}})</p>
        <p class="help has-text-info" v-else>Will only be used if it's greater than user's groups' immunity</p>
      </div>
      <h6 class="title is-6">Base Flags</h6>
      <p class="subtitle is-6">Permission flags for in-game. Only flags you have access to can be added</p>
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
      <Field>
        <AdminPermissionInput v-model="webCodes" />
      </Field>
    </Tab>
    <Tab name="Actions">
      <div class="field" v-if="userAdminData">
        <div class="control">
          <a class="button is-danger" @click='revoke'>Revoke Admin</a>
        </div>
        <p class="help has-text-danger">This will remove all admin privileges, for the web and in-game.</p>
      </div>
      <div class="field" v-if="privUser.hasPermission('admins.disable_policy_check')">
        <div class="control">
          <a :class="['button',{'is-danger': form.policyCheck, 'is-info': !form.policyCheck}]" @click='togglePolicyCheck'>
            <template v-if="form.policyCheck">Disable policy checks</template>
            <template v-else>Enable policy checks</template>
          </a>
        </div>
        <p class="help has-text-danger">This will disable any policy checks, and allow granting or editing admins. Does not disable immunity checks</p>
      </div>
      <div class="field" v-if="userAdminData && !privUser.equals(user.steamid) && privUser.hasPermission('admins.impersonate')">
        <div class="control">
          <a class="button" style="background-color: #c42dbf; color: white;" @click='impersonate'>
            <template v-if='privUser.ImpersonatingSteamId === userAdminData.steamid'>
              Stop Impersonating
            </template>
            <template v-else>
              Impersonate
            </template>
          </a>
        </div>
        <p class="help">Impersonate as this user, mimicking their permissions.</p>
      </div>

    </Tab>
  </Tabs>
  <hr>
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
      <p><b>Warning:</b> No permissions have been granted to the user. The user will not have any admin privileges in game and limited access to the admin panel.</p>
      <p>Apply a permission group, apply some base permissions, or some panel permissions.</p>
    </div>
  </article>
  <article class="message is-warning" v-if="!form.policyCheck">
    <div class="message-body">
      <p><b>Warning:</b> Policy checks have been ignored. </p>
    </div>
  </article>
  <Teleport to="#manage-user-footer">
    <button
      :class="['button','has-tooltip-top', 'is-success',{'is-loading': loading.save}]"
      :disabled="cantAddAdmin || !canEdit"
      @click="save"
    >{{ props.userAdminData ? 'Save Changes' : 'Grant Admin Privileges' }}</button>
    <button
      class="button"
      @click="reset"
    >Reset</button>
  </Teleport>
</section>

</template>

<script setup lang="ts">
import AdminPermissionInput from '@/components/AdminPermissionInput.vue'
import Field from '@/components/Field.vue'
import { ref, onMounted, computed } from 'vue'
import { User, PrivilegedUser, PlayerData } from '@/js/User'
import { useRouter, useRoute } from 'vue-router'
import { FLAGS, AdminGroup, ReadableAdminData } from '../../../../../common-types/User';
import FlagList from '@/components/FlagList.vue'
// @ts-ignore
import { Tab, Tabs } from 'vue3-tabs-component'
import { notify } from '@kyvg/vue3-notification';
import { request } from '@/js/util';


const MIN_HOURS_PLAYTIME = 8
const POLICY_MSG_MIN_HOURS_OF_PLAYTIME = `Policy requires a minimum of ${MIN_HOURS_PLAYTIME} hours of playtime`
const router = useRouter()
const route = useRoute()
const props = defineProps<{
  userAdminData: ReadableAdminData,
  user: PlayerData,
  privUser: PrivilegedUser
}>()

let webCodes = ref<string[]>(props.userAdminData?.permissions.base.codes ?? [])


let groups = ref<AdminGroup[]>([])
// let tabIndex = ref<Tab>(Tab.Groups)
let form = ref<{
  immunity: number,
  flags: string[],
  policyCheck: boolean
}>({
  immunity: 0,
  flags: [],
  policyCheck: true,
})
function reset() {
  form.value = {
    flags: props.userAdminData?.permissions.base.flags?.split("") || [],
    immunity: props.userAdminData?.permissions.base.immunityLevel || 0,
    policyCheck: true
  }
}
let stats = ref<Record<string, string|number>|null>()
let fetchError = ref("")
let loading = ref({
  stats: true,
  groups: true,
  save: false
})
let expandedGroup = ref<AdminGroup>()
let selectedgroupIds = ref<number[]>([])

const noEditReasons = computed(() => {
  if(props.privUser.equals(props.user.steamid)) return ["Cannot edit your own profile"] // Disable editing ourself
  const reasons = []
  if(!props.privUser.hasPermission("admins.edit", props.user.steamid)) reasons.push("You lack the privileges to edit privileges")
  if(props.userAdminData && form.value.immunity >= props.privUser.immunityLevel) reasons.push("You lack the access to edit this user")
  return reasons
})
const canEdit = computed(() => {
  return noEditReasons.value.length == 0 && (!form.value.policyCheck || policyFailures.value.length == 0)
})

const policyFailures = computed(() => {
  const failures: string[] = []
  if(props.userAdminData) return failures

  if(hoursPlayed.value < MIN_HOURS_PLAYTIME) failures.push(POLICY_MSG_MIN_HOURS_OF_PLAYTIME + ` (they have ${hoursPlayed.value} hours)`)
  if(props.user?.bansCount || 0 > 0) failures.push('Player cannot have any bans on record.')
  return failures
})
const hasRoot = computed(() => {
  return canEdit.value && props.privUser.flags?.includes('z')
})
const hoursPlayed = computed(() => {
  if(!stats) return 0
  return Math.round(stats.value?.minutes_played as number / 60)
})
const playtime = computed(() => {
  if(!stats) return
  if(hoursPlayed.value > 0) return hoursPlayed.value.toLocaleString()
  return "< 0"
})
const noAddReasons = computed(() => {
  const msgs = []
  if(hoursPlayed.value < MIN_HOURS_PLAYTIME) {
    msgs.push(POLICY_MSG_MIN_HOURS_OF_PLAYTIME)
  }
  return msgs
})
const cantAddAdmin = computed(() => {
  return noAddReasons.value.length > 0 && !(!form.value.policyCheck || policyFailures.value.length == 0) && !canEdit.value
})

const noPermsGiven = computed(() => {
  return form.value.flags.length === 0 && selectedgroupIds.value.length === 0
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
function togglePolicyCheck() {
  form.value.policyCheck = !form.value.policyCheck
}

interface POSTAdminAPI {
  immunityLevel: number,
  flags: string,
  groupIds: string,
}
async function revoke() {
  if(window.confirm(`Are you sure you want to revoke ${props.user?.name}'s admin privileges? They will no longer be able to use any admin commands, see admin chat, or view any administration pages online.`)) {
    const response = await request(`/api/admins/${props.user?.steamid}`, {
      method: 'DELETE',
      credentials: 'include'
    }, { title: "Revoke Admin Failed"})
    if(response?.ok) {
      notify({
        type: "success",
        text: `Revoked ${props.user.name}'s admin privileges`
      })
      cancel()
    }
  }
}
async function impersonate() {
  // Set id to null/"" to stop impersonating
  const isImpersonating = props.privUser.ImpersonatingSteamId == props.userAdminData.steamid
  const id = isImpersonating ? "" : props.userAdminData.steamid
  const response = await request(`/api/admins/impersonate/${id}`, {
    method: 'POST',
    credentials: 'include'
  }, { title: "Impersonation Failed"})
  if(response?.ok) {
    notify({
      type: "success",
      text: `${isImpersonating ? "Stopped" : "Now"} impersonating ${props.user.name}`
    })
    // Lazy reload the page to force refetch of data. Otherwise need to pass response ==> App.vue
    location.href = "/"
  }
}
async function save() {
  if(cantAddAdmin.value) {
    alert(`Cannot add admin for the following reasons:\n* ${noAddReasons.value.join('\n *')}`)
  } else {
    loading.value.save = true;
    const response = await request(`/api/admins/${props.user?.steamid}`, {
      method: props.userAdminData ? 'PUT': 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        immunityLevel: form.value.immunity,
        flags: form.value.flags.join(''),
        groupIds: selectedgroupIds.value.join(','),
        name: props.user?.name,
        codes: webCodes.value
      } as POSTAdminAPI)
    }, { title: "Save Admin Failed" })

    if(response?.ok) {
      notify({
        type: "success",
        text: "Saved admin successfully"
      })
    }
  }
  loading.value.save = false
}

function cancel() {
  router.push('/admin/players')
}

async function getGroups(): Promise<AdminGroup[]> {
  loading.value.groups = true
  const res = await request('/api/admins/groups')
  loading.value.groups = false
  if(res?.ok) {
    return (await res.json()).groups
  } else {
    return []
  }
}

async function loadData() {
  fetchError.value = ""
  if(props.userAdminData) {
    reset()
    selectedgroupIds.value = props.userAdminData.groups?.map(group => group.id) || []
  }
  try {
    loading.value.stats = true
    try {
      stats.value = await User.getStats(route.params.id as string)
    } catch(err) {
      console.error(`Failed to fetch statistics for user:`, err)
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

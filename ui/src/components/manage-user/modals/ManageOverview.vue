<template>
<section>
  <div class="tabs">
    <ul>
      <!-- TODO: disable 'profile' for non-admins -->
      <li v-for="tab in TABS" :key="tab.id" :class="{'is-active': route.params.tab === tab.id }"><router-link :to="{params: { tab: tab.id }}">{{ tab.name }}</router-link></li>
    </ul>
  </div>
  <template v-if="route.params.tab === 'stats'">
    <h5 class="title is-5">Player Statistics</h5>
    <div v-if="!info" class="container has-text-centered">
      <br>
      <p v-if="statsFailure" class="has-text-danger"><b>Error:</b> {{ statsFailure }}</p>
      <Icon v-else icon="spinner" spin>Fetching player statistics... please wait</Icon>
      <br>
    </div>
    <template v-else>
      <div class="level">
        <div class="level-item has-text-centered">
          <div class="field">
            <label class="label">Playtime</label>
            <span>
              <p v-if="info">
                {{ playtime }} hours
              </p>
              <em v-else>(no recorded statistics found)</em>
            </span>
          </div>
        </div>
        <div class="level-item has-text-centered">
          <div class="field">
            <label class="label">First Joined</label>
            <span v-if="info">
              <template v-if="info.created_date">
                {{ formatDate(info.created_date) }}
                <p>{{ getRelDate(info.created_date) }}</p>
              </template>
              <em v-else>unknown</em>
            </span>
            <span v-else><em>(no recorded statistics found)</em></span>
          </div>
        </div>
        <div class="level-item has-text-centered">
          <div class="field">
            <label class="label">Last Online</label>
            <span v-if="info">
              <template v-if="info.last_join_date">
                {{ formatDate(info.last_join_date) }}
                <p>{{ getRelDate(info.last_join_date) }}</p>
              </template>
              <em v-else>unknown</em>
            </span>
            <span v-else><em>(no recorded statistics found)</em></span>
          </div>
        </div>
      </div>
      <div class="level">
        <div class="level-item has-text-centered">
          <div class="field">
            <label class="label">Country</label>
            <span>{{ info.country }}</span>
          </div>
        </div>
        <div class="level-item has-text-centered">
          <div class="field">
            <label class="label">Friendly Fires</label>
            <span>{{ info.survivor_ff.toLocaleString() }}</span>
          </div>
        </div>
        <div class="level-item has-text-centered">
          <div class="field">
            <label class="label" data-tooltip="Self heals compared to healing other players">Heal Ratio</label>
            <span>{{ info.heal_self.toLocaleString() }} : {{ info.heal_others.toLocaleString() }}</span>
          </div>
        </div>
        <div class="level-item has-text-centered">
          <div class="field">
            <label class="label">Team kills</label>
            <span>{{ info.ff_kills.toLocaleString() }}</span>
          </div>
        </div>
      </div>
    </template>
    <br>
    <div class="level is-size-4">
      <div class="level-item"><a :href="'https://stats.jackz.me/user/' + props.user.steamid" target="_blank">Stats Profile</a></div>
      <div class="level-item"><a :href="'https://steamcommunity.com/profiles/' + steamid64" target="_blank">Steam Profile</a></div>
      <div class="level-item"><router-link :to="{ name: 'logs-audit', query: { client: props.user.steamid } }" target="_blank">
        View Logs
      </router-link></div>
    </div>
  </template>
  <template v-else-if="route.params.tab === 'names'">
    <p class="subtitle">Showing all known names of user, sorted by recent first</p>
    <template v-if="nameHistory.data">
      <List v-if="nameHistory.data.length > 1">
        <ListItem v-for="entry in nameHistory.data" :key="entry.timestamp">
          <template #title>
            {{ entry.name }}
          </template>
          <template #description>
            {{ formatDate(entry.timestamp) }}
          </template>
        </ListItem>
      </List>
      <p v-else>User has not been recorded with any changed names</p>
    </template>
  </template>
  <template v-else-if="route.params.tab === 'profile'">
    <div class="box pt-0 has-background-primary-light">
      <figure class="image is-48x48 is-inline-block mr-3 is-round mt-4">
        <img :src="'/api/users/' + props.user.steamid + '/avatar'" style="height:48px;width:48px">
      </figure>
      <div class="is-inline-block">
        <p class="title is-5">{{ props.user.name }}</p>
        <p class="subtitle is-6">{{ props.user.steamid }}</p>
      </div>
      <div class="is-inline is-pulled-right mt-2">
        <div><a :href="'https://stats.jackz.me/users/' + props.user.steamid + '/overview'" target="_blank">Stats Profile</a></div>
        <div><a :href="'https://steamcommunity.com/profiles/' + steamid64" target="_blank">Steam Profile</a></div>
        <div><router-link :to="{ name: 'logs-audit', query: { client: props.user.steamid } }" target="_blank">
        View Logs
      </router-link></div>
      </div>
      <div class="columns mt-2">
        <div class="column is-6">
          <Field label="Reputation">
            <template v-if="analysis.loadState == LoadState.Loading">
              <Icon icon="fa-spinner" icon-class="mr-2" spin>Fetching</Icon>
            </template>
            <div v-else-if="analysis.loadState == LoadState.Error" class="has-text-danger has-tooltip-danger" data-tooltip="Could not fetch analysis">
              <Icon icon="fa-exclamation-triangle">
                {{ analysis?.errorReason ?? 'Could not fetch analysis' }}
              </Icon>
            </div>
            <template v-else-if="analysis.data">
              {{ convertSnakeToHuman(analysis.data.rating.key) }}
              <span :class="{'has-text-success' : analysis.data.rating.value > 0, 'has-text-danger': analysis.data.rating.value < 0 }">
                ({{ analysis.data.rating.value.toLocaleString() }})
              </span>
            </template>
            <em v-else>No Data</em>
          </Field>
        </div>
      </div>
      <template v-if="userAdminData">
        <hr>
        <article v-if="profile.loadState == LoadState.Error" class="message is-danger">
          <div class="message-body">
            Could not fetch user's profile data at this time.
          </div>
        </article>
        <div v-else-if="profile.loadState == LoadState.Loading" class="has-text-centered my-5">
          <Icon icon="fa-spinner" icon-class="mr-2" class="is-size-4" spin>Fetching user's profile</Icon>
        </div>
        <div v-else-if="profile.data" class="columns mt-2">
          <div class="column is-6">
            <Field label="Birthday">
              <p v-if="!profile.editing">
                <template v-if="profile.data.birthMonth">{{ MONTHS[profile.data.birthMonth] }}</template><em v-else>(not set)</em>
                <span class="ml-1"><template v-if="profile.data.birthDate">{{ profile.data.birthDate }}</template><em v-else>(not set)</em></span>
                <a v-if="isSelfProfile" class="ml-1" @click="profile.editing = true">(Change)</a>
              </p>
              <Teleport v-if="profile.editing" to="#manage-user-footer">
                <button
                  :class="['button','has-tooltip-top']"
                  @click="profile.editing = false"
                >Cancel</button>
                <button
                  :class="['button','has-tooltip-top', 'is-success',{'is-loading': profile.loadState == LoadState.Updating }]"
                  @click="setProfileData"
                >Save Profile Changes</button>
              </Teleport>
              <div v-if="isSelfProfile && profile.editing" class="field is-grouped">
                <div class="control">
                  <div class="select">
                    <select v-model="profile.data.birthMonth">
                      <option v-for="(month, i) in MONTHS" :key="month" :value="i">{{ month }}</option>
                    </select>
                  </div>
                </div>
                <p class="control">
                  <input v-model="profile.data.birthDate" style="width:6rem" class="input" type="number" :min="1" :max="30" placeholder="Day" />
                </p>
              </div>
            </Field>
          </div>
        </div>
        <div v-else-if="userAdminData" class="content mt-2">
          <article class="message is-primary">
            <div class="message-body">
              User has not setup a profile
            </div>
          </article>
        </div>
      </template>
    </div>
  </template>
  <template v-else-if="route.params.tab === 'actions'">
    <div class="buttons">
      <button class="button is-pulled-right has-tooltip-right" data-tooltip="Updates our local copy of their name and avatar" @click="updateSteamInfo">Update Steam Info</button>
    </div>
</template>
</section>
</template>

<script setup lang='ts'>
import { ref, computed, watch, onBeforeMount } from 'vue';
import { PrivilegedUser, PlayerData } from '@/js/User'
import { useRouter, useRoute } from 'vue-router'
import { AdminData, UserProfileData, AnalysisData, UserNameEntry } from '../../../../../common-types/User';
import { notify } from '@kyvg/vue3-notification';
import SteamID from 'steamid';
import { formatDate, getRelDate, request, getErrorReason } from '@/js/util';
import Field from '@/components/Field.vue';
import { convertSnakeToHuman } from '../../../js/util';
import { FetchData, LoadState, GetDefaultFetchData } from '../../../types/global';
import List from '@/components/List.vue';
import ListItem from '@/components/ListItem.vue';

const MONTHS = [ "January", "February", "March", "April", "May", "June",
"July", "August", "September", "October", "November", "December" ];

const TAB_DATA: { id: string, name: string, enableFn?: () => boolean }[] = [
  { id: "profile", name: 'Profile' },
  { id: "names", name: "Names" },
  { id: "stats", name: 'Stats' },
  { id: "actions", name: 'Actions' }
]
const TABS = computed(() => {
  return TAB_DATA.filter(tab => {
    return !tab.enableFn || tab.enableFn()
  })
})

const emit = defineEmits(['update-user'])
const router = useRouter()
const route = useRoute()
const props = defineProps<{
  privUser: PrivilegedUser,
  userAdminData: AdminData,
  user: PlayerData
}>()
let profile = ref<FetchData<UserProfileData>>(GetDefaultFetchData());

let analysis = ref<FetchData<AnalysisData>>(GetDefaultFetchData());
let nameHistory = ref<FetchData<UserNameEntry[]>>(GetDefaultFetchData())
let statsFailure = ref<string|undefined>()


let info = ref<any>()
const isSelfProfile = computed(() => {
  return props.privUser.equals(props.user.steamid)
})
const steamid64 = computed(() => {
  return new SteamID(props.user.steamid).getSteamID64()
})
const playtime = computed(() => {
  if(!info.value) return "0"
  if(info.value.minutes_played > 0) return Math.round(info.value.minutes_played / 60).toLocaleString()
  return "< 0"
})

watch(() => props.user.steamid, () => {
  info.value = undefined
  profile.value = { data: null, loadState: LoadState.Loading, editing: false }
  analysis.value = { data: null, loadState: LoadState.Loading, }
  statsFailure.value = undefined
  onTab(route.params.tab as string)
})

async function onTab(tabId: string) {
  const tabData = TABS.value.find(tab => tab.id == tabId)
  // If there is no tab, or the tab is not valid for user, reset to stats
  if(!tabData || tabData.enableFn && !tabData.enableFn()) {
    router.replace({...route, ...{ params: { ...route.params, tab: 'profile'}}})
    return
  }
  if(tabId === "stats" && !info.value) {
    await Promise.allSettled([
      fetchStats(),
    ])
  } else if(tabId === "names" && !nameHistory.value.data) {
    await fetchNameHistoryData()
  } else if(tabId === "profile" && !profile.value.data) {
    await Promise.allSettled([
      fetchProfileData(),
      fetchAnalysis()
    ])
  }
}

watch(() => route.params.tab, async (tab) => {
  await onTab(tab as string)
})

async function setProfileData() {
  profile.value.loadState = LoadState.Updating
  const response = await request(`/api/users/${props.user.steamid}/profile`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(profile.value.data)
  })
  profile.value.loadState = LoadState.Success
  profile.value.editing = false
  if(response?.ok) {
    const json = await response.json()
    profile.value.data = json
    notify({
      type: "success",
      text: "Profile changes saved."
    })
  }
}
async function fetchNameHistoryData() {
  nameHistory.value.loadState = LoadState.Loading
  const response = await fetch(`/api/users/${props.user.steamid}/names`)
  if(response.ok) {
    nameHistory.value.loadState = LoadState.Success
    const json = await response.json()
    nameHistory.value.data = json
  } else if(response.status === 404) {
    nameHistory.value.loadState = LoadState.Success
    nameHistory.value.data = null
  } else {
    notify({
      type: "error",
      title: "Could not fetch user's name history",
      text: await getErrorReason(response)
    })
  }
}

async function fetchProfileData() {
  profile.value.loadState = LoadState.Loading
  const response = await fetch(`/api/users/${props.user.steamid}/profile`)
  if(response.ok) {
    profile.value.loadState = LoadState.Success
    const json = await response.json()
    profile.value.data = json
  } else if(response.status === 404) {
    profile.value.loadState = LoadState.Success
    profile.value.data = null
  } else {
    notify({
      type: "error",
      title: "Could not fetch profile data",
      text: await getErrorReason(response)
    })
  }
}

async function fetchAnalysis() {
  try {
    const response = await fetch(`/api/analyze/${props.user.steamid}`)
    const json = await response.json()
    if(response.ok) {
      analysis.value = {
        data: json,
        loadState: LoadState.Success
      }
    } else {
      const error = await getErrorReason(response)
      analysis.value = {
        data: null,
        loadState: LoadState.Error,
        errorReason: error
      }
      notify({
        type: "error",
        title: 'Error fetching player analysis',
        text: error
      })
    }
  } catch(err: any) {
    analysis.value = {
      data: null,
      loadState: LoadState.Error,
      errorReason: err.message
    }
    notify({
      type: "error",
      title: 'Error fetching player analysis',
      text: err.message
    })
  }
}
async function fetchStats() {
  try {
    const response = await fetch(`https://stats.jackz.me/api/users/${props.user.steamid}`)
    const json = await response.json()
    if(response.ok) {
      info.value = json.user
      if(json.not_found) {
        statsFailure.value = "No statistics found for user"
      }
    } else {
      statsFailure.value = json.message ?? json.error
      notify({
        type: "error",
        title: 'Error fetching player statistics',
        text: json.message ?? json.error
      })
    }
  } catch(err: any) {
    statsFailure.value = err.message
    notify({
      type: "error",
      title: 'Error fetching player statistics',
      text: err.message
    })
  }
}

async function updateSteamInfo() {
  const response = await request(`/api/users/${props.user.steamid}/update`, { method: 'POST' })
  if(response?.ok) {
    const json = await response.json()
    emit('update-user', json.user)
    notify({
      type: "success",
      text: "Updated steam info"
    })
  }
}

onBeforeMount(async () => {
  if(!route.params.tab) {
    router.replace({...route, ...{ params: { ...route.params, tab: 'stats'}}})
  }
  onTab(route.params.tab as string)
})
</script>

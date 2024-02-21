<template>
<section>
  <div class="tabs">
    <ul>
      <li v-for="(name, tab) in TAB_NAMES" :key="tab" :class="{'is-active': route.params.tab === tab }"><router-link :to="{params: { tab }}">{{ name }}</router-link></li>
    </ul>
  </div>
  <template v-if="route.params.tab === 'stats'">
    <h5 class="title is-5">Player Statistics</h5>
    <div class="container has-text-centered" v-if="!info">
      <br>
      <p class="has-text-danger" v-if="statsFailure"><b>Error:</b> {{ statsFailure }}</p>
      <Icon icon="spinner" spin v-else>Fetching player statistics... please wait</Icon>
      <br>
    </div>
    <template v-else>
      <div class="level">
        <div class="level-item has-text-centered">
          <div class="field">
            <label class="label">Playtime</label>
            <span>
              <p v-if="info">
                {{playtime}} hours
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
                {{formatDate(info.created_date)}}
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
                {{formatDate(info.last_join_date)}}
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
            <span>{{info.country}}</span>
          </div>
        </div>
        <div class="level-item has-text-centered">
          <div class="field">
            <label class="label">Friendly Fires</label>
            <span>{{info.survivor_ff.toLocaleString()}}</span>
          </div>
        </div>
        <div class="level-item has-text-centered">
          <div class="field">
            <label class="label" data-tooltip="Self heals compared to healing other players">Heal Ratio</label>
            <span>{{info.heal_self.toLocaleString() }} : {{ info.heal_others.toLocaleString() }}</span>
          </div>
        </div>
        <div class="level-item has-text-centered">
          <div class="field">
            <label class="label">Team kills</label>
            <span>{{info.ff_kills.toLocaleString()}}</span>
          </div>
        </div>
      </div>
    </template>
    <br>
    <h5 class="title is-5">Player Analysis</h5>
    <div class="container has-text-centered" v-if="!analysis">
      <br>
      <p class="has-text-danger" v-if="analysisFailure"><b>Error:</b> {{ analysisFailure }}</p>
      <Icon icon="spinner" spin v-else>Fetching player analysis... please wait</Icon>
      <br>
    </div>
    <div class="level" v-else>
      <div class="level-item has-text-centered">
        <div class="field">
          <label class="label">Reputation</label>
          <template v-if="analysis.rating.key">
            {{ analysis.rating.key }}
            <span :class="{'has-text-success' : analysis.rating.value > 0, 'has-text-danger': analysis.rating.value < 0 }">
              ({{analysis.rating.value.toLocaleString()}})
            </span>
          </template>
          <em v-else>no data</em>
        </div>
      </div>
      <div class="level-item has-text-centered">
        <div class="field">
          <label class="label">Ratings</label>
          <span>{{analysis.reputation.sum.toLocaleString()}}</span>
        </div>
      </div>
    </div>
    <br>
    <div class="level is-size-4">
      <div class="level-item"><a :href="'https://stats.jackz.me/user/' + props.user.steamid" target="_blank">Stats Profile</a></div>
      <div class="level-item"><a :href="'https://steamcommunity.com/profiles/' + steamid64" target="_blank">Steam Profile</a></div>
      <div class="level-item"><router-link :to="{ name: 'logs-audit', query: { client: props.user.steamid } }" target="_blank">
        View Logs
      </router-link></div>
    </div>
  </template>
  <template v-else-if="route.params.tab === 'profile'">
    <article class="message is-danger" v-if="profile.loadState == LoadState.Error">
      <div class="message-body">
        Could not fetch user's profile data at this time.
      </div>
    </article>
    <div class="has-text-centered my-5" v-else-if="profile.loadState == LoadState.Loading || !profile.data">
      <Icon icon="fa-spinner" icon-class="mr-2" spin>Fetching user's profile</Icon>
    </div>
    <div class="box" v-else>
      <figure class="image is-48x48 is-inline-block mr-3 is-round">
        <img :src="'/api/users/' + props.user.steamid + '/avatar'" style="height:48px;width:48px">
      </figure>
      <div class="is-inline-block">
        <p class="title is-5">{{ props.user.name }}</p>
        <p class="subtitle is-6">{{ props.user.steamid }}</p>
      </div>
      <div class="content mt-2">
        <Field label="Birthday">
          <p v-if="!profile.editing">
            <template v-if="profile.data.birthMonth">{{ MONTHS[profile.data.birthMonth] }}</template><em v-else>(not set)</em>
            <span class="ml-1"><template v-if="profile.data.birthDate">{{ profile.data.birthDate }}</template><em v-else>(not set)</em></span>
            <a class="ml-1" v-if="isSelfProfile" @click="profile.editing = true">(Change)</a>
          </p>
          <Teleport to="#manage-user-footer" v-if="profile.editing">
            <button
              :class="['button','has-tooltip-top']"
              @click="profile.editing = false"
            >Cancel</button>
            <button
              :class="['button','has-tooltip-top', 'is-success',{'is-loading': profile.loadState == LoadState.Updating }]"
              @click="setProfileData"
            >Save Profile Changes</button>
          </Teleport>
          <div class="field is-grouped" v-if="isSelfProfile && profile.editing">
            <p class="control">
              <div class="select">
                <select v-model="profile.data.birthMonth">
                  <option v-for="(month, i) in MONTHS" :key="month" :value="i">{{ month }}</option>
                </select>
              </div>
            </p>
            <p class="control">
              <input style="width:6rem" class="input" type="number" :min="1" :max="30" placeholder="Day" v-model="profile.data.birthDate"/>
            </p>
          </div>
        </Field>
      </div>
    </div>
  </template>
  <template v-else-if="route.params.tab === 'actions'">
    <div class="buttons">
      <button class="button is-pulled-right" @click="updateSteamInfo">Update Steam Info</button>
    </div>
</template>
</section>
</template>

<script setup lang='ts'>
import { ref, onMounted, computed, watch, onBeforeMount } from 'vue';
import { User, PrivilegedUser, PlayerData } from '@/js/User'
import { useRouter, useRoute } from 'vue-router'
import { AdminData, UserProfileData } from '../../../../../common-types/User';
import { notify } from '@kyvg/vue3-notification';
import SteamID from 'steamid';
import { formatDate, getRelDate, request } from '@/js/util';
import Field from '@/components/Field.vue';
//@ts-expect-error
import { Tab } from 'vue3-tabs-component';

const MONTHS = [ "January", "February", "March", "April", "May", "June",
"July", "August", "September", "October", "November", "December" ];

const TAB_NAMES: Record<string, string> = {
  stats: 'Stats',
  profile: 'Profile',
  actions: 'Actions'
}

const emit = defineEmits(['update-user'])
const router = useRouter()
const route = useRoute()
const props = defineProps<{
  privUser: PrivilegedUser,
  userAdminData: AdminData,
  user: PlayerData
}>()
enum LoadState {
  Loading,
  Success,
  Error,
  Updating
}
let profile = ref<{ data: UserProfileData | null, loadState: LoadState, editing: boolean}>({
  data: null,
  loadState: LoadState.Loading,
  editing: false
})
let analysis = ref()
let analysisFailure = ref<string>()
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
  analysis.value = undefined
  analysisFailure.value = undefined
  statsFailure.value = undefined
  onTab(route.params.tab as string)
})

async function onTab(tab: string) {
  if(tab === "stats" && !info.value) {
    await Promise.allSettled([
      fetchStats(),
      fetchAnalysis()
    ])
  } else if(tab === "profile" && !profile.value.data) {
    await fetchProfileData()
  }
}

watch(() => route.params.tab, async (tab) => {
  await onTab(tab as string)
})

async function setProfileData() {
  profile.value.loadState == LoadState.Updating
  const response = await request(`/api/users/${props.user.steamid}/profile`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(profile.value.data)
  })
  profile.value.loadState == LoadState.Success
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
async function fetchProfileData() {
  profile.value.loadState = LoadState.Loading
  const response = await request(`/api/users/${props.user.steamid}/profile`)
  if(response?.ok) {
    profile.value.loadState = LoadState.Success
    const json = await response.json()
    profile.value.data = json
  } else {
    profile.value.loadState = LoadState.Error
  }
}

async function fetchAnalysis() {
  try {
    const response = await fetch(`/api/analyze/${props.user.steamid}`)
    const json = await response.json()
    if(response.ok) {
      analysis.value = json
      if(json.not_found) {
        analysisFailure.value = "No statistics found for user"
      }
    } else {
      analysisFailure.value = json.message ?? json.error
      notify({
        type: "error",
        title: 'Error fetching player analysis',
        text: json.message ?? json.error
      })
    }
  } catch(err: any) {
    analysisFailure.value = err.message
    notify({
      type: "error",
      title: 'Error fetching player analysis',
      text: err.message
    })
  }
}
async function fetchStats() {
  try {
    const response = await fetch(`https://stats.jackz.me/api/user/${props.user.steamid}`)
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

<template>
<section>
  <div class="container has-text-centered" v-if="!info">
    <br>
    <p class="has-text-danger" v-if="statsFailure">{{ statsFailure }}</p>
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
              {{playtime.toLocaleString()}} hours
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

  <ul class="content is-medium">
    <li><a :href="'https://stats.jackz.me/user/' + props.user.steamid" target="_blank">Stats Profile</a></li>
    <li><a :href="'https://steamcommunity.com/profiles/' + steamid64" target="_blank">Steam Profile</a></li>
    <li><router-link :to="{ name: 'logs-activity', query: { client: props.user.steamid } }" target="_blank">View Logs</router-link></li>
  </ul>
</section>
</template>

<script setup lang='ts'>
import { ref, onMounted, computed, watch, onBeforeMount } from 'vue';
import { User, PrivilegedUser, PlayerData } from '@/js/User'
import { useRouter, useRoute } from 'vue-router'
import { UserData, WebPermission, WebRole, AdminData } from '../../../../../common-types/User';
import { notify } from '@kyvg/vue3-notification';
import SteamID from 'steamid';
import { formatDate, getRelDate } from '@/js/util';

const router = useRouter()
const route = useRoute()
const props = defineProps<{
  userdata: UserData,
  userAdminData: AdminData,
  user: PlayerData
}>()

let statsFailure = ref<string|undefined>()


let info = ref<any>()
const steamid64 = computed(() => {
  return new SteamID(props.user.steamid).getSteamID64()
})
const playtime = computed(() => {
  if(!info.value) return
  if(info.value.minutes_played > 0) return info.value.minutes_played
  return "< 0"
})

async function fetchInfo() {
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
        title: 'Could Not Fetch User Info',
        text: json.message ?? json.error
      })
    }
  } catch(err: any) {
    statsFailure.value = err.message
    notify({
      type: "error",
      title: 'Could Not Fetch User Info',
      text: err.message
    })
  }
}

onBeforeMount(async () => {
  await fetchInfo()
})
</script>

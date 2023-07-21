<template>
<section>
  <div class="tabs">
    <ul>
      <li v-for="userBan in bans" :key="userBan.id" :class="{'is-active': ban && ban.id === userBan.id, 'striked': userBan?.expired}" @click="selectBan(userBan)">
        <a>#{{ userBan.id }}&nbsp;<span class="tag is-info" v-if="userBan.activeAppeal">Appeal</span></a>
      </li>
      <li :class="{'is-active': isNewBan }" @click="selectBan()" v-if="canAddBan"><a>Add Ban</a></li>
      <li :class="{'is-active': showAppeals }" @click="showAppealsList" v-if="bans.length > 0"><a>Appeals ({{ appeals.length }})</a></li>
    </ul>
  </div>
  <Teleport to="#manage-user-footer">
    <button v-if="!showAppeals"
      :class="['button','has-tooltip-top', 'is-success',{'is-loading': loading }]"
      @click="save"
    >{{ isNewBan ? "Ban User" : "Edit Ban" }}</button>
  </Teleport>
  <template v-if="showAppeals">
    <p v-if="appeals.length == 0" class="has-text-centered my-6">User has no ban appeals</p>
    <template v-else>
    <div class="notification" v-for="appeal in appeals" :key="appeal.id">
        <div class="tags is-inline">
          <span class="tag is-primary has-tooltip-right" data-tooltip="ID of the appeal" >{{ appeal.id }}</span>
          <span class="tag is-dark has-tooltip-right" data-tooltip="IP Address that submitted appeal" v-if="appeal.ip">{{ appeal.ip }}</span>
          <span :class="['tag', { 'is-success': appeal.state == 1, 'is-danger': appeal.state == 2, 'is-info': appeal.state == 0}]">{{ getAppealState(appeal.state) }}</span>
        </div>
        <span class="is-pulled-right is-inline"> {{ formatDate(appeal.created)}}</span>
        <div class="content">
          {{ appeal.message }}

          <p class="has-text-danger" v-if="appeal.state == 2"><b>Rejected by {{ appeal.rejecter_id }}: </b><br>{{ appeal.reject_reason }}</p>

          <div class="buttons mt-2" v-if="appeal.state == 0">
            <a class="button is-success is-outlined is-small" @click="answerAppeal(appeal.id, true)">Appeal Ban</a>
            <a class="button is-danger is-outlined is-small" @click="answerAppeal(appeal.id, false)">Reject</a>
          </div>
        </div>
    </div>
    </template>
  </template>
  <template v-else-if="ban">
    <article class="message is-link" v-if="!isNewBan && ban.activeAppeal">
      <div class="message-body">
        <h6 class="title is-6">
          User wishes to appeal this ban:
          <span class="is-pulled-right has-text-weight-normal">{{ formatDate(ban.activeAppeal.created) }}</span>
        </h6>

        {{ban.activeAppeal.message}}
        <span v-if="ban.activeAppeal.ip" data-tooltip="IP address of appeal" class="tag is-pulled-right has-text-weight-normal is-dark">{{ ban.activeAppeal.ip }}</span>
        <br><br>
        <div class="buttons">
          <a class="button is-success is-outlined" @click="answerAppeal(ban!.activeAppeal!.id, true)">Appeal Ban</a>
          <a class="button is-danger is-outlined" @click="answerAppeal(ban!.activeAppeal!.id, false)">Reject</a>
        </div>
      </div>
    </article>
    <div class="columns is-multiline is-centered">
      <div class="column" v-if="!isNewBan">
        <div class="field">
          <label class="label">ID</label>
          <p>{{ban.id}}</p>
        </div>
      </div>
      <div class="column" v-if="!isNewBan">
        <div class="field">
          <label class="label">IP</label>
          <p v-if="ban.ip">{{ban.ip}}</p>
          <em v-else>(no ip recorded)</em>
        </div>
      </div>
      <div class="column" v-if="!isNewBan">
        <div class="field">
          <label class="label">Join Attempts</label>
          <p>{{ban.joinAttempts}}</p>
        </div>
      </div>
      <div class="column">
        <div class="field">
          <label class="label">Country</label>
          <p v-if="props.user.country">{{props.user.country}}</p>
          <em v-else>unknown</em>
        </div>
      </div>
    </div>

    <div class="columns">
      <div class="column">
        <div class="field">
          <label class="label">Banned By</label>
          <span v-if="isNewBan">
            <p>{{privUser.name}}</p>
            ({{privUser.id}})
          </span>
          <template v-else>
            <input v-if="edited.executorId" v-model="edited.executorId" class="input" type="text" @blur="onExEditBlur" />
            <span v-else @click="edited.executorId = ban!.executor!.id">
              <p>{{ban!.executor!.name}}</p>
              ({{ban!.executor!.id}})
            </span>
          </template>
        </div>
      </div>

      <div class="column">
        <div class="field">
          <label class="label">Timestamp</label>
          <p v-if="isNewBan">{{ formatDate() }}</p>
          <template v-else>
            <p>{{formatDate(ban.timestamp)}}</p>
            <em>about {{relDate}}</em>
          </template>
        </div>
      </div>

      <div class="column">
        <div class="field">
          <label class="label">Expires</label>
          <div class="control">
            <div class="select">
              <select v-model="edited.expires">
                <option value="never">Never</option>
                <option value="keep">Don't Change</option>
                <option value="1hour">1 Hour</option>
                <option value="1day">1 Day</option>
                <option value="1day">1 Day</option>
                <option value="1week">1 Week</option>
                <option value="1month">1 Month</option>
              </select>
            </div>
          </div>
          <p class="help has-text-danger" v-if="ban.expired">Ban has expired</p>
          <p class="help" v-else-if="ban.expires">Will expire on {{formatDate(ban.expires)}}</p>
          <p class="help" v-else>Ban will never expire</p>
        </div>
      </div>

    </div>

    <div class="field">
      <label class="label">Private Reason</label>
      <div class="control">
        <textarea
          v-model="edited.reason"
          class="textarea has-fixed-size"
          placeholder="Enter a reason for this ban (only shown to admins)"
          maxlength="128"
          rows=1
          ></textarea>
      </div>
    </div>
    <div class="field">
      <label class="label">Shown Reason (optional)</label>
      <div class="control">
        <textarea
          v-model="edited.publicReason"
          class="textarea has-fixed-size"
          placeholder="Enter a reason for this ban (shown to banned user)"
          maxlength="250"
          rows=1
          ></textarea>
      </div>
      <p class="help">If no public reason is given, it will default to the private reason</p>
    </div>
    <div class="columns">
      <div class="column">
        <div class="field">
          <label class="label">Flags</label>
          <div class="buttons">
            <div class="button is-warning" v-if="edited.flags & APIBanFlags.Suspended" @click="toggleFlag(APIBanFlags.Suspended)" data-tooltip="Click to resume this ban">Suspended</div>
            <div class="button is-outlined" v-else @click="toggleFlag(APIBanFlags.Suspended)" data-tooltip="Click to suspend this ban">Suspend</div>
            <div class="button is-info" v-if="edited.flags & APIBanFlags.IPBan" @click="toggleFlag(APIBanFlags.IPBan)" data-tooltip="Click to disable the ip ban">IP Banned</div>
            <div class="button is-outlined" v-else @click="toggleFlag(APIBanFlags.IPBan)" data-tooltip="Click to enable ip ban">IP Ban</div>
          </div>
        </div>
      </div>
      <div class="column is-5" v-if="!isNewBan">
        <div class="field">
          <label class="label">Danger Zone</label>
          <div class="control">
            <a class="button is-danger" @click='deleteBan'>Purge Record</a>
          </div>
          <p class="help has-text-danger">This will remove the ban from the records, suspending is recommended instead</p>
        </div>
      </div>
    </div>
  </template>
  <div v-else class="has-text-centered my-6">
    <p>User has no bans on record</p>
    <p v-if="props.userAdminData" class="has-text-danger">You cannot add a ban to an admin</p>
    <p v-else-if="!canAddBan" class="has-text-danger">You lack the permission to add a ban</p>
  </div>
</section>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { PrivilegedUser, PlayerData } from '@/js/User'
import { useRouter, useRoute } from 'vue-router'
import { ClientUserData, AdminData } from '../../../../../common-types/User';
import { notify } from '@kyvg/vue3-notification';
// TOOD: fix
import { FullAPIBan, APIBanFlags, BanAppeal, BanAppealState } from '../../../../../common-types/Ban';
import { formatDate, getRelDate } from '@/js/util';

const emit = defineEmits(["close"])
const router = useRouter()
const route = useRoute()
const props = defineProps<{
  userdata: ClientUserData,
  userAdminData: AdminData,
  user: PlayerData,
  privUser: PrivilegedUser,
}>()


let ban = ref<Partial<BanRecord>>();
let banOriginalExpires = ref<number>()
let edited = ref<{
  reason?: string,
  publicReason?: string,
  expires: string,
  executorId?: string
  flags: number
}>({ expires: "keep", flags: 0 })
let appeals = ref<BanAppeal[]>([])

let isNewBan = ref(false)
// let ban = ref({
//   client: {
//     id: undefined,
//     name: undefined
//   },
//   publicReason: undefined,
//   privateReason: undefined,
//   expires: "never",
//   flags: []
// })

function toggleFlag(flag: APIBanFlags) {
  edited.value.flags ^= flag
}

interface BanRecord extends FullAPIBan { activeAppeal?: BanAppeal }

let loading = ref(false)
let showAppeals = ref(false)
let bans = ref<BanRecord[]>([])

watch(() => edited.value.expires, (value) => {
  if(!ban.value) return
  ban.value.expires = calculateExpires(value)
})

function calculateExpires(value: string) {
  if(value === "never") return 0
  const baseDate = new Date().valueOf()
  if(value === "1hour") {
    return (baseDate  + 3.6e+6) / 1000
  }else if(value === "1day") {
    return (baseDate  + 8.64e+7) / 1000
  }else if(value === "1week") {
    return (baseDate  + 6.048e+8) / 1000
  } else if(value === "1month") {
    return (baseDate  + 2629800000) / 1000
  } else if(value === "1year") {
    return (baseDate + 3.156e+10) / 1000
  } else {
    if(value !== "keep")
      alert('Could not save unknown value: ' + value)
    return banOriginalExpires.value
  }
}

const canAddBan = computed(() => {
  return !props.userAdminData && props.privUser.hasPermission("bans.create")
})

const relDate = computed(() => {
  if(!ban.value) return
  return ban.value?.timestamp ? getRelDate(ban.value.timestamp) : null
})

function selectBan(selectedBan?: FullAPIBan) {
  showAppeals.value = false
  if(!selectedBan) {
    router.push({
      params: {
        banid: null
      }
    })
    isNewBan.value = true
    ban.value = {
      client: {
        id: props.user.steamid,
        name: props.user.name
      },
      publicReason: "",
      reason: "",
      expires: 0,
      flags: 0
    }
    edited.value = {
      publicReason: "",
      reason: "",
      executorId: undefined,
      expires: "keep",
      flags: 0
    }
  } else {
    router.push({
      params: {
        banid: selectedBan.id
      }
    })
    ban.value = selectedBan
    banOriginalExpires.value = selectedBan.expires
    edited.value = {
      publicReason: selectedBan.publicReason,
      reason: selectedBan.reason,
      executorId: undefined,
      expires: "keep",
      flags: selectedBan.flags
    }
    isNewBan.value = false
  }
}
function showAppealsList() {
  router.push({
      params: {
        banid: "appeals",
      }
    })
  showAppeals.value = true;
  isNewBan.value = false;
  ban.value = undefined
}

function onExEditBlur() {
  if(!ban.value) return
  ban.value.executor = {
    id: edited.value.executorId!,
    name: undefined
  }
  edited.value.executorId = undefined
}
async function save() {
  if(!ban.value) return
  loading.value = true
  try {
    const response = await fetch(`/api/bans/${isNewBan.value ? props.user.steamid : ban.value.id}`, {
      method: isNewBan.value ? 'POST' : 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        executor: edited.value.executorId,
        reason: edited.value.reason,
        flags: edited.value.flags,
        public_message: edited.value.publicReason,
        expires: ban.value.expires
      })
    })
    const json = await response.json()
    if(response.ok) {
      notify({
        type: "success",
        text: isNewBan.value ? `Created new ban #${json.banId}` : `Edited ban #${json.banId}`
      })
      close()
    } else {
      notify({
        type: "error",
        title: `${isNewBan.value ? 'Add' : 'Edit'} Ban Failed`,
        text: json.message
      })
    }
  } catch(err: any) {
    notify({
      type: "error",
      title: `${isNewBan.value ? 'Add' : 'Edit'} Ban Failed`,
      text: err.message
    })
  } finally {
    loading.value = false
  }
}
async function deleteBan() {
  if(!ban.value) return
  if(window.confirm("Are you sure you want to remove this ban from the records? This should only be done if the ban was a mistake. It is recommend to suspend the ban instead.")) {
    try {
      const response = await fetch(`/api/bans/${ban.value.id}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      const json = await response.json()
      if(response.ok) {
        notify({
          type: "success",
          text: `Deleted ban ${ban.value.id} successfully`
        })
        close()
      } else {
        notify({
          type: "error",
          title: "Delete Ban Failed",
          text: json.message
        })
      }
    } catch(err: any) {
      notify({
        type: "error",
        title: "Delete Ban Failed",
        text: err.message
      })
    } finally {
      loading.value = false
    }
  }
}
async function answerAppeal(id: number, approve: boolean) {
  let reason, reasonQuery
  if(!approve) {
    reason = prompt("Enter reason for the appeal rejection: ")
    if(!reason) {
      return notify({
        type: "error",
        text: "A reason for rejection is required"
      })
    }
    if(reason) reasonQuery = `?reason=${encodeURIComponent(reason)}`
  }

  try {
    const response = await fetch(`/api/appeals/${id}/${approve? 'approve': 'reject'}${reasonQuery}`, {
      method: 'POST',
      credentials: 'include'
    })

    if(response.ok) {
      notify({
        type: "success",
        text: approve ? "Ban has been appealed" : "Ban appeal has been rejected"
      })
      let appeal = appeals.value.find(appeal => appeal.id == id)
      if(appeal) {
        appeal.reject_reason = reason
        appeal.rejecter_id = props.privUser.id
        appeal.state = approve ? BanAppealState.Accepted : BanAppealState.Rejected
      }
    } else {
      const json = await response.json()
      notify({
        type: "error",
        text: json.message
      })
    }
  } catch(err: any) {
    notify({
      type: "error",
      text: err.message
    })
  }
}
function close() {
  emit("close")
  // router.back()
}

async function getBans() {
  try {
    const response = await fetch(`/api/users/${route.params.id}/bans`)
    const json = await response.json()
    if(response.ok) {
      bans.value = json.bans.map((ban: FullAPIBan) => {
        const activeAppeal = ban.appeals?.filter(appeal => appeal.state === BanAppealState.Pending)
        if(ban.appeals) appeals.value = [ ... appeals.value, ... ban.appeals ]
        return {
          ...ban,
          activeAppeal: (activeAppeal && activeAppeal.length > 0) ? activeAppeal[0] : null
        }
      })
    } else {
      notify({
        type: "error",
        title: "Fetching bans failed",
        text: json.message
      })
    }
  } catch(err: any) {
    notify({
      type: "error",
      title: "Fetching bans failed",
      text: err.message
    })
  }
}
function getAppealState(state: number) {
  switch(state) {
    case BanAppealState.Pending:
      return "Pending"
    case BanAppealState.Accepted:
      return "Accepted"
    case BanAppealState.Rejected:
      return "Rejected"
  }
}

onMounted(async() => {
  await getBans()
  if(route.params.banid) {
    if(route.params.banid == "appeals") return showAppealsList()
    const ban = bans.value.find(ban => ban.id === Number(route.params.banid))
    if(ban) return selectBan(ban)
  } else if(!props.userAdminData)
    selectBan()
})
</script>

<style>
.striked { text-decoration: line-through; }
</style>

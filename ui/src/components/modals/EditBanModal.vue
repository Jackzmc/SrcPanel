<template>
  <div class="modal is-active" v-if="ban&&edited">
    <div class="modal-background"></div>
    <div class="modal-card">
      <header class="modal-card-head">
        <p class="modal-card-title"><b>{{ban.client.name}}</b> <span class="is-pulled-right">{{ban.client.id}}</span></p>&nbsp;&nbsp;
      </header>
      <section class="modal-card-body">
        <div class="tabs">
          <ul>
            <li :class="{'is-active': tab == 0}" @click="setTab(0)"><a>Review</a></li>
            <li :class="{'is-active': tab == 1}" @click="setTab(1)"><a>Appeals</a></li>
            <li :class="{'is-active': tab == 2}" @click="setTab(2)"><a>Notes</a></li>
            <li :class="{'is-active': tab == 3}" @click="setTab(3)"><a>Info</a></li>
          </ul>
        </div>
        <template v-if="tab == 0">
        <div class="columns is-multiline">
          <div class="column is-2">
            <div class="field">
              <label class="label">ID</label>
              <p>{{ban.id}}</p>
            </div>
          </div>
          <div class="column">
            <div class="field">
              <label class="label">IP</label>
              <p v-if="ban.ip">{{ban.ip}}</p>
              <em v-else>(no ip recorded)</em>
            </div>
          </div>
          <div class="column">
            <div class="field">
              <label class="label">Country</label>
              <p v-if="ban.country">{{ban.country}}</p>
              <em v-else>unknown</em>
            </div>
          </div>
          <div class="column">
            <div class="field">
              <label class="label">Join Attempts</label>
              <p>{{ban.joinAttempts}}</p>
            </div>
          </div>
        </div>

        <div class="columns">
          <div class="column is-8">
            <div class="field">
              <label class="label">Banned By</label>
              <input v-if="executorEdit.active" v-model="executorEdit.edit.id" class="input" type="text" @blur='onExEditBlur' />
              <span v-else @click='executorEdit.active = true'>
                <p>{{ban.executor.name}}</p>
                ({{ban.executor.id}})
              </span>
            </div>
          </div>
          <div class="column">
            <div class="field">
              <label class="label">Timestamp</label>
              <p>{{formatTime(ban.timestamp)}}</p>
              <em>about {{relDate}}</em>
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
          <label class="label">Shown Reason</label>
          <div class="control">
            <textarea
              v-model="edited.publicReason"
              class="textarea has-fixed-size"
              placeholder="Enter a reason for this ban (shown to target)"
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
              <div class="control">
                <div class="select is-multiple">
                  <select multiple size="2" v-model="flags.edited" @change="changed = true">
                    <option value="1">IP Banned</option>
                    <option value="2">Suspended</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
          <div class="column">
            <div class="field">
              <label class="label">Expires</label>
              <div class="control">
                <div class="select">
                  <select v-model="edited.expires">
                    <option value="never" v-if="ban.expires">Never</option>
                    <option value="keep">Don't Change</option>
                    <option value="1hour">1 Hour</option>
                    <option value="1day">1 Day</option>
                    <option value="1day">1 Day</option>
                    <option value="1week">1 Week</option>
                    <option value="1month">1 Month</option>
                  </select>
                </div>
              </div>
              <p class="help has-text-danger" v-if="ban.expired">Ban is currently expired</p>
              <p class="help" v-else-if="ban.expires">Will expire on {{formatTime(ban.expires)}}</p>
              <p class="help" v-else>Ban will not currently expire.</p>
            </div>
          </div>
          <div class="column">
            <div class="field">
              <label class="label">Danger Zone</label>
              <div class="control">
                <a class="button is-danger" @click='deleteBan'>Remove Ban Record</a>
              </div>
              <p class="help has-text-danger">This will remove the ban from the records, suspending is recommended instead</p>
            </div>
          </div>
        </div>
      </template>

      <template v-else-if="tab == 1">
        <div class="container has-text-centered" v-if="appeals.state == 0">
          <br>
          <p>Fetching appeals... please wait</p>
          <br>
        </div>
        <template v-else-if="appeals.state == 1">
          <div class="container has-text-centered" v-if="appeals.list.length == 0">
            <br>
            <p>User has not submitted any appeals.</p>
            <br>
          </div>
          <div class="box" v-for="appeal in appeals.list" :key="appeal.id">
            <h5 class="title is-5">Appeal #{{appeal.id}}</h5>
            <p class="subtitle is-6">Submitted {{formatTime(appeal.created)}}</p>
            <article class="message">
              <div class="message-body">
                {{appeal.message}}
              </div>
            </article>
            <div class="buttons" v-if="appeal.state == 0">
              <a :class="['button','is-success',{'is-loading': loading}]" @click='setAppealState(appeal, true)'>Approve</a>
              <a :class="['button','is-danger',{'is-loading': loading}]" @click='setAppealState(appeal, false)'>Reject</a>
            </div>
            <div v-else-if="appeal.state == 1">
              <p class="has-text-success">Appeal was approved</p>
            </div>
            <div v-else-if="appeal.state == 2">
              <p class="has-text-danger"><b>Appeal was rejected: </b></p>
              <p class="has-text-danger">{{appeal.reject_reason}}</p>
            </div>
          </div>
        </template>
      </template>

      <template v-else-if="tab == 2">
        <div class="container has-text-centered" v-if="notes.state == 0">
          <br>
          <p>Fetching notes... please wait</p>
          <br>
        </div>
        <template v-else-if="notes.state == 1">
          <div class="container has-text-centered" v-if="notes.list.length == 0">
            <br>
            <p>User has no attached notes.</p>
            <!-- <p><a>Add a new note</a></p> -->
            <br>
          </div>
          <div class="box" v-for="note in notes.list" :key="note.id">
            <h6 class="title is-6">#{{note.id}}: {{note.markedBy.name}} ({{note.markedBy.id}})</h6>

            "{{note.content}}"
          </div>
        </template>
      </template>

      <template v-else-if="tab == 3">
        <div class="container has-text-centered" v-if="!info">
          <br>
          <p>Fetching player statistics... please wait</p>
          <br>
        </div>
        <div class="container has-text-centered" v-else>
          <div class="columns">
            <div class="column">
              <label class="label">Friendly Fires</label>
              <p>{{info.survivor_ff}}</p>
            </div>
            <div class="column">
              <label class="label">Self Heals</label>
              <p>{{info.heal_self}}</p>
            </div>
            <div class="column">
              <label class="label">Heals (Other)</label>
              <p>{{info.heal_others}}</p>
            </div>
            <div class="column">
              <label class="label">Hours Played</label>
              <p>{{Math.round(info.minutes_played - info.minutes_idle / 60)}}</p>
            </div>
            <div class="column">
              <label class="label">Team kills</label>
              <p>{{info.ff_kills}}</p>
            </div>
          </div>

        </div>

        <br>

        <ul class="content is-medium">
          <li><a :href="'https://stats.jackz.me/user/' + ban.steamid" target="_blank">Stats Profile</a></li>
          <li><a :href="'https://steamcommunity.com/profiles/' + steamid64" target="_blank">Steam Profile</a></li>
          <li><a :href="'?client=' + ban.steamid + '#logs'" target="_blank">View Logs</a></li>
        </ul>
      </template>

      </section>
      <footer class="modal-card-foot" v-if="tab == 0">
        <button :disabled="!hasChanged" :class="['button','is-success',{'is-loading': loading}]" @click="save">Save changes</button>
        <button :class="['button',{'is-loading': loading}]" @click="cancel">Cancel</button>
        <p class="has-text-danger" v-if="error">{{error}}</p>
      </footer>
      <footer class="modal-card-foot" v-else-if="tab == 1 || tab == 2 || tab == 3">
        <button :disabled="loading" :class="['button',{'disabled': loading}]" @click="cancel">Done</button>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import SteamID from 'steamid';
import { computed, onBeforeMount, ref, watch } from 'vue'
import { useRoute } from 'vue-router';

const route = useRoute()
const emit = defineEmits(['edit'])

let ban = ref<any>(null)
let tab = ref(0)
let edited = ref<any>(null)
let error = ref<string>()
let changed = ref(false)
let flags = ref<{original: any[], edited: any[]}>({
  original: [],
  edited: []
})
let loading = ref(false)
let appeals = ref<{list: any[], state: number}>({
  list: [],
  state: 0
})
let notes = ref<{list: any[], state: number}>({
  list: [],
  state: 0
})
let executorEdit = ref<{active: boolean, edit: any}>({
  active: false,
  edit: null
})
let info = ref<any>(null)

const hasChanged = computed(() => {
  return edited.value && ban.value.reason !== edited.value.reason
    || ban.value.publicReason !== edited.value.publicReason
    || ban.value.executor.id !== executorEdit.value.edit.id
    || flags.value.original.length !== flags.value.edited.length
    || edited.value.expires !== "keep"
})

watch(edited, (val) => {
  if(changed.value || !val) return
  changed.value = ban.value.reason !== val.reason
    || ban.value.publicReason !== val.publicReason
    || ban.value.executor.id !== executorEdit.value.edit.id
    || flags.value.original.length !== flags.value.edited.length
    || val.expires !== "keep"
  })

const steamid64 = computed(() => {
  if(!ban.value) return null
  return new SteamID(ban.value.client.id).getSteamID64()
})
const relDate = computed(() => {
  return ban.value.timestamp ? getRelDate(ban.value.timestamp*1000) : null
})

async function init() {
  error.value = undefined
  const response = await fetch(`/api/bans/${route.params.id}`)
  if(response.ok) {
      const json = await response.json()
      if(json.bans.length === 0) {
        console.error('No bans were found for id?')
        return
      }
      ban.value = json.bans[0]
      edited.value = Object.assign({}, ban.value)
      edited.value.expires = 'keep'
      flags.value.original = []
      for(const i of [1,2,4]) {
        if(ban.value.flags & i) flags.value.original.push(i.toString())
      }
      executorEdit.value.edit = ban.value.executor
      flags.value.edited = [...flags.value.original]
      appeals.value.list = []
      appeals.value.state = 0
      changed.value = false
      info.value = null
      setTab(0)
  }
}

function onExEditBlur() {
  if(ban.value.executor.id === executorEdit.value.edit.id) {
    executorEdit.value.active = false
  }
}
async function setAppealState(appeal: any, approved: boolean) {
  loading.value = true
  let rejectReason
  if(!approved) {
    rejectReason = prompt("Enter the reason for rejecting:")
    if(!rejectReason) return
  }
  const state = approved ? 1 : 2
  let query = `?id=${appeal.id}&state=${state}`
  if(rejectReason) query += `&reject_reason=${rejectReason}`
  const response = await fetch(`https://jackz.me/l4d2/appeal/appeal.php${query}`, {
    method: 'PUT',
  })
  if(response.ok) {
    loading.value = false
    fetchAppeals()
    if(approved) {
      edited.value.flags |= 2
      flags.value.edited.push(2)
    }
  } else {
    appeals.value.state = 2
    alert("Could not update the status of the appeal: " + await response.text())
    return null
  }
}

function setTab(index: number) {
  tab.value = index
  switch(index) {
    case 1: {
      if(ban.value.appeals == 0) appeals.value.state = 1
      else if(appeals.value.state === 0) fetchAppeals()
      break
    }
    case 2: {
      if(ban.value.notes == 0) notes.value.state = 1
      else if(notes.value.state === 0) fetchNotes()
      break
    }
    case 3: {
      if(!info.value) fetchInfo()
    }
  }
}
async function fetchInfo() {
  const response = await fetch(`https://stats.jackz.me/api/user/${ban.value.client.id}`)
  if(response.ok) {
    const json = await response.json()
    info.value = json.user
  } else {
    alert("Could not fetch user statistics: " + await response.text())
  }
}
async function fetchAppeals() {
  const response = await fetch(`https://jackz.me/l4d2/appeal/appeal.php?id=${ban.value.id}`)
  if(response.ok) {
      const json = await response.json()
      appeals.value.list = json.appeals
      appeals.value.state = 1
  } else {
    appeals.value.state = 2
    alert("Could not fetch appeals: " + await response.text())
    return null
  }
}
async function fetchNotes() {
  const response = await fetch(`/api/notes/user/${ban.value.client.id}`)
  if(response.ok) {
      const json = await response.json()
      notes.value.list = json.notes
      notes.value.state = 1
  } else {
    notes.value.state = 2
    alert("Could not fetch notes: " + await response.text())
    return null
  }
}
function formatTime(time: number) {
  const date = new Date(time*1000)
  return `${date.toLocaleDateString()} at ${date.toLocaleTimeString()}`
}
function deleteBan() {
  if(window.confirm("Are you sure you want to remove this ban from the records? This should only be done if mistakes were made when banning them. Recommend to suspend the ban instead.")) {
    fetch(`/api/bans/${ban.steamid}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include'
    })
    .then(async(response) => {
      if(response.ok) {
        cancel()
        alert("Ban was successfully removed")
      } else
        error.value = await response.text()
    })
    .catch(err => {
      error.value = err.message
    })
  }
}
function save() {
  loading.value = true
  const expires = getExpires(edited.value, ban.value)
  const _flags = flags.value.edited.reduce((pv, cv) => pv + Number(cv), 0)
  fetch(`/api/bans/${ban.value.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({
      steamid: edited.value.client.id,
      reason: edited.value.reason,
      executor: executorEdit.value.edit.id,
      public_message: edited.value.publicReason,
      expires,
      flags: _flags
    })
  })
  .then(async(response) => {
    if(response.ok)
      emit('edit', {
        ...edited.value,
        flags
      })
    else
      error.value = (await response.json()).error
    loading.value = false
  })
  .catch(err => {
    error.value = err.message
    loading.value = false
  })
}
function cancel() {
  emit('edit', null)
}

onBeforeMount(() => {
  init()
})

function getRelDate(time: number) {
  const date = new Date(time || ""),
    diff = (((new Date()).getTime() - date.getTime()) / 1000),
    day_diff = Math.floor(diff / 86400);
  if (isNaN(day_diff) || day_diff < 0 || day_diff >= 31) return "<invalid date>"

  return day_diff == 0 && (
  diff < 60 && "just now" || diff < 120 && "1 minute ago" || diff < 3600 && Math.floor(diff / 60) + " minutes ago" || diff < 7200 && "1 hour ago" || diff < 86400 && Math.floor(diff / 3600) + " hours ago") || day_diff == 1 && "Yesterday" || day_diff < 7 && day_diff + " days ago" || day_diff < 31 && Math.ceil(day_diff / 7) + " weeks ago";
}

function getExpires(edited: any, ban: any) {
  const baseDate = Date.now() / 1000

  if(edited.expires === "keep") return null
  else if(edited.expires === "never") return "never"
  else if(edited.expires === "1hour") {
    return baseDate + 3600
  }else if(edited.expires === "1day") {
    return baseDate + 86400
  }else if(edited.expires === "1week") {
    return baseDate + 604800
  } else if(edited.expires === "1month") {
    return baseDate + 2.628e+6
  } else {
    alert('Could not save unknown value: ' + edited.expires)
    return null
  }
}

</script>


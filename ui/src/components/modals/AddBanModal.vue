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
        <div class="tabs">
          <ul>
            <li :class="{'is-active': tab == 0}" @click="setTab(0)"><a>Review</a></li>
            <li :class="{'is-active': tab == 2}" @click="setTab(2)"><a>Notes</a></li>
          </ul>
        </div>
        <template v-if="tab == 0">
        <div class="columns is-multiline">
          <div class="column">
            <div class="field">
              <label class="label">Country</label>
              <p v-if="user.country">{{user.country}}</p>
              <em v-else>unknown</em>
            </div>
          </div>
        </div>

        <div class="columns">
          <div class="column is-8">
            <div class="field">
              <label class="label">Banned By</label>
              <span>
                <p>{{userdata.user.name}}</p>
                ({{userdata.user.steamid}})
              </span>
            </div>
          </div>
          <div class="column">
            <div class="field">
              <label class="label">Timestamp</label>
              <p>{{formatTime()}}</p>
            </div>
          </div>

        </div>

        <div class="field">
          <label class="label">Private Reason</label>
          <div class="control">
            <textarea
              v-model="ban.privateReason"
              class="textarea has-fixed-size"
              placeholder="Enter a reason for ban (only shown to admins)"
              maxlength="128"
              rows=1
              ></textarea>
          </div>
        </div>
        <div class="field">
          <label class="label">Shown Reason</label>
          <div class="control">
            <textarea
              v-model="ban.publicReason"
              class="textarea has-fixed-size"
              placeholder="Enter a reason for ban (shown to target)"
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
                  <select multiple size="2" v-model="ban.flags">
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
                  <select v-model="ban.expires">
                    <option value="never">Never</option>
                    <option value="1hour">1 Hour</option>
                    <option value="1day">1 Day</option>
                    <option value="1day">1 Day</option>
                    <option value="1week">1 Week</option>
                    <option value="1month">1 Month</option>
                    <option value="1year">1 Year</option>
                  </select>
                </div>
              </div>
              <p class="help" v-if="ban.expires !== 'never'">Will expire on {{formatTime(expiresTimestamp)}}</p>
              <p class="help" v-else>Ban will not expire.</p>
            </div>
          </div>
        </div>
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

      </section>
      <footer class="modal-card-foot">
        <button :class="['button','is-danger',{'is-loading': loading}]" @click="save">Add Ban</button>
        <button :class="['button',{'is-loading': loading}]" @click="cancel">Cancel</button>
        <p class="has-text-danger" v-if="error">{{error}}</p>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { User, PrivilegedUser, PlayerData } from '@/js/User'
import { useRouter, useRoute } from 'vue-router'
import { Session, WebPermission, WebRole } from '../../../../common-types/User';

const router = useRouter()
const route = useRoute()
const props = defineProps<{
  userdata: Session
}>()


let tab = ref(0)
let ban = ref({
  client: {
    id: undefined,
    name: undefined
  },
  publicReason: undefined,
  privateReason: undefined,
  expires: "never",
  flags: []
})
let error = ref<string>()
let loading = ref(false)
let notes = ref<{
  state: number, list: any[]}
>({
  state: 0,
  list: []
})
let user = ref<PlayerData>()
const privUser = new PrivilegedUser(props.userdata)

const expiresTimestamp = computed(() => {
  if(ban.value.expires === "never") return 0
  const baseDate = new Date().valueOf()
  if(ban.value.expires === "1hour") {
    return (baseDate  + 3.6e+6) / 1000
  }else if(ban.value.expires === "1day") {
    return (baseDate  + 8.64e+7) / 1000
  }else if(ban.value.expires === "1week") {
    return (baseDate  + 6.048e+8) / 1000
  } else if(ban.value.expires === "1month") {
    return (baseDate  + 2629800000) / 1000
  } else if(ban.value.expires === "1year") {
    return (baseDate + 3.156e+10) / 1000
  } else {
    alert('Could not save unknown value: ' + ban.value.expires)
    return 0
  }
})
function setTab(index: number) {
  tab.value = index
  switch(index) {
    case 2: {
      if(notes.value.state === 0 && user.value) fetchNotes()
      break
    }
  }
}
async function fetchNotes() {
  const response = await fetch(`/api/notes/user/${user.value!.steamid}`)
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
function formatTime(time?: number | null) {
  const date = time ? new Date(time*1000) : new Date()
  return `${date.toLocaleDateString()} at ${date.toLocaleTimeString()}`
}
async function save() {
  loading.value = true
  try {
    const response = await fetch(`/api/bans/${user.value!.steamid}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        steamid: ban.value.client.id,
        reason: ban.value.privateReason,
        executor: privUser.id,
        public_message: ban.value.publicReason,
        expires: expiresTimestamp.value!,
        flags: ban.value.flags.reduce((pv, cv) => pv + Number(cv), 0)
      })
    })
    if(response.ok) {
      const json = await response.json()
      router.push(`/bans/edit/${json.banId}`)
      cancel()
    } else {
      error.value = (await response.json()).error
    }
    loading.value = false
  } catch(err: any) {
    error.value = err.message
    loading.value = false
  }
}
function cancel() {
  router.back()
}
onMounted(async() => {
  error.value = undefined
  const response = await fetch(`/api/users/${route.params.id}`)
  if(response.ok) {
    const json = await response.json()
    if(!json.user) {
      console.error('No users were found for id?')
      return
    }
    user.value = json.user
    setTab(0)
  }
})
</script>

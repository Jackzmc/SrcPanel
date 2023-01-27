<template>
  <div class="container is-fullwidth is-fluid">
    <div class="columns">
      <div class="column" v-if="notes">
        <h4 class="title is-4 has-text-centered">Notes</h4>
        <p class="subtitle is-=6">
          The ID column shows the id of the note, with the rating of the note's message.
        </p>
        <table class="table is-fullwidth">
          <thead>
            <tr>
              <th>ID</th>
              <th>User</th>
              <th>Added By</th>
              <th>Note</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="note in filteredNotes" :key="note.id">
              <td class="has-tooltip-right" :data-tooltip="'Rating: ' + note.rating.value">
                <span :class="note.class">{{note.id}}</span>
              </td>
              <td><a :data-tooltip="note.client.id" :href="getStatURL(note.client.id)" :class="{'has-text-danger': note.banned}">{{note.client.name ?? note.client.id}}</a></td>
              <td><a :data-tooltip="note.markedBy.id" :href="getStatURL(note.markedBy.id)">{{note.markedBy.name}}</a></td>
              <td v-if="note.actionData">
                <div class="field is-horizontal is-grouped is-grouped-multiline">
                  <div class="control">
                    <div class="tags has-addons">
                      <span class="tag is-dark">Action</span>
                      <span class="tag is-secondary">{{note.actionData[0]}}</span>
                    </div>
                  </div>
                  <div class="control">
                    <div class="tags has-addons" v-if="note.actionData[1]">
                      <span class="tag is-info">Key</span>
                      <span class="tag is-secondary">{{note.actionData[1]}}</span>
                    </div>
                  </div>
                  <div class="control">
                    <div class="tags has-addons" v-if="note.actionData[2]">
                      <span class="tag is-success">Value</span>
                      <span class="tag is-secondary">{{note.actionData[2]}}</span>
                    </div>
                  </div>
                </div>
              </td>
              <td v-else>{{note.content}}</td>
              <td>
                <div class="tags">
                  <span v-if="note.actionData" class="tag is-success" data-tooltip="Has an automatic action">Action</span>
                  <span v-if="note.banned" class="tag is-danger">Banned</span>
                  <span v-if="note.client.id == note.markedBy.id" class="tag is-secondary" data-tooltip="Note creator added note to themselves">Self-marked</span>
                  <span v-else-if="note.client.isAdmin" class="tag is-secondary" data-tooltip="This note was added to an admin">Admin</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="column" v-else-if="fetchError">
        <p class="my-5 is-size-2 has-text-centered has-text-danger">{{ fetchError }}</p>
      </div>
      <div class="column" v-else>
        <p class="my-5 is-size-2 has-text-centered">Fetching notes...</p>
      </div>
      <div class="column is-3">
        <div class="message is-warning">
          <div class="message-body">
            <b>Looking for Admins?</b>
            <p>You can find the admins list in the <b><router-link to="/admin/players#admins">Player Management</router-link></b> panel</p>
          </div>
        </div>
        <h4 class="title is-4">Search By User</h4>
        <input class="input" v-model="search.user" />
        <br><br>
        <h4 class="title is-4">Search Note Message</h4>
        <input class="input" v-model="search.content" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onBeforeMount, onMounted, computed } from 'vue'
import { Session } from '../../../common-types/User.js';
import data from '@/assets/data.json'
import Sentiment from 'sentiment'
const sentiment = new Sentiment();
const analyzeOptions = {
  extras: data.sentimentWords
};

const props = defineProps<{
  userdata: Session
}>()

let fetchError = ref<string|undefined>(undefined)
let notes = ref<any[] | undefined>(undefined)
let admins = ref<any[]>([])
let search = ref<{ user: string, content: string }>({ user: "", content: "" })

onBeforeMount(() => {
  fetchNotes()
})

onMounted(() => {
  if(props.userdata) fetchAdmins()
})

const POSITIVE_WORDS = ["good", "great", "decent", "amazing", "helpful", "yes"]
const CAUTION_WORDS = ["ok", "alright", "noob", "new", "noobs", "no", "burned", "dumb", "suspicious", "nooby", "tried", "threw", "tossed", "waste", "waster", "meh"]
const NEGATIVE_WORDS = ["troll", "teamkiller", "tk", "tker", "bad", "stupid", "annoying", "lit", "sucks", "unhelpful", "spam", "rushes", "rusher", "dick", "asshole", "cunt"]

const filteredNotes = computed(() => {
  let filtered = notes.value
  if(search.value.user != '') {
    let query = search.value.user.toLowerCase()
    let onlyMarkedBy = query.startsWith("$")
    if(onlyMarkedBy) {
      query = query.slice(1)
    }

    filtered = filtered.filter(note => {
      return (!onlyMarkedBy && (note.client.id.includes(query) || note.client.name?.toLowerCase().includes(query)))
        || note.markedBy.id.includes(query) || note.markedBy.name?.toLowerCase().includes(query)
    })
  }

  if(search.value.content != '') {
    const query = search.value.content.toLowerCase()
    filtered = filtered.filter(note => note.content.toLowerCase().includes(query))
  }

  return filtered.sort((a,b) => b.id - a.id)
})

async function fetchNotes() {
  notes.value = undefined
  try {
    const response = await fetch('/api/notes')
    const json = await response.json()
    if(response.ok) {
      notes.value = json.notes.map((note: any) => {
        note.content = note.content.trim()
        note.class = ["tag"]
        if(note.content.startsWith("@")) {
          note.actionData = note.content.slice(1).split(".")
        }
        note.rating = computeRating(note.content)
        if(note.rating) {
          if(note.rating.key === "positive") note.class.push("is-success")
          else if(note.rating.key === "negative") {
            note.class.push("is-danger")
          } else if(note.rating.key === "neutral") {
            note.class.push("is-warning")
          }
        } else {
          note.class.push("is-secondary")
        }
        return note
      })
    } else {
      fetchError.value = json.message
    }
  } catch(err) {
    fetchError.value = err.message
  }
}

function computeRating(content: string) {
  content = content.toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"")
    .replace(/\s{2,}/g," ");
  const { score } = sentiment.analyze(content, analyzeOptions)
  let key = null
  if(score >= 2) key = "positive"
  else if(score <= -2) key = "negative"
  else if(score != 0) key = "neutral"
  return { key, value: score }

  let obj = {
    positive: 0, neutral: 0, negative: 0
  }
  for(let word of content.split(" ")) {
    word = word
    if(POSITIVE_WORDS.includes(word)) obj.positive++
    else if(CAUTION_WORDS.includes(word)) obj.neutral++
    else if(NEGATIVE_WORDS.includes(word)) obj.negative++
  }
  const highest = getHighest(obj)
  if(highest.value <= 0) return null
  return highest
}

function getHighest(obj: Record<string, number>) {
  let curKey: string|null = null, curVal = -1
  for(const [key, val] of Object.entries(obj)) {
    if(val > curVal || !curKey) {
      curKey = key;
      curVal = val;
    }
  }
  return { key: curKey, value: curVal }
}

function fetchAdmins() {
  fetch('/api/admins')
    .then(response => response.json())
    .then(json => {
      admins.value = json.admins
    })
}

function getStatURL(steamid: string) {
  return `https://stats.jackz.me/user/${steamid}`
}
</script>

<template>
  <div class="container is-fullwidth is-fluid">
    <div class="columns">
      <div class="column">
        <h4 class="title is-4 has-text-centered">Notes</h4>
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
            <tr v-for="note in notes" :key="note.id">
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
                  <span v-if="note.isAdmin" class="tag is-warning">Admin</span>
                  <span v-if="note.client.id == note.markedBy.id" class="tag is-secondary" data-tooltip="Self-marked">Self-marked</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="column is-3">
        <div class="message is-warning">
          <div class="message-body">
            <b>Looking for Admins?</b>
            <p>You can find the admins list in the <b><router-link to="/admin/players">Player Management</router-link></b> panel</p>
          </div>
        </div>
        <h4 class="title is-4">Search By User</h4>
        <input class="input" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onBeforeMount, onMounted } from 'vue'
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

let notes = ref<any[]>([])
let admins = ref<any[]>([])

onBeforeMount(() => {
  fetchNotes()
})

onMounted(() => {
  if(props.userdata) fetchAdmins()
})

const POSITIVE_WORDS = ["good", "great", "decent", "amazing", "helpful", "yes"]
const CAUTION_WORDS = ["ok", "alright", "noob", "new", "noobs", "no", "burned", "dumb", "suspicious", "nooby", "tried", "threw", "tossed", "waste", "waster", "meh"]
const NEGATIVE_WORDS = ["troll", "teamkiller", "tk", "tker", "bad", "stupid", "annoying", "lit", "sucks", "unhelpful", "spam", "rushes", "rusher", "dick", "asshole", "cunt"]

function fetchNotes() {
  fetch('/api/notes')
    .then(response => response.json())
    .then(result => {
      notes.value = result.notes.map((note: any) => {
        note.content = note.content.trim()
        note.class = ["tag"]
        if(note.content.startsWith("$")) {
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
    })
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

import { Session } from '../../../common-types/User';
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
              <th>Banned</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="note in notes" :key="note.id">
              <td>
                {{note.id}}
              </td>
              <td><a :href="getStatURL(note.client.id)">{{note.client.name}}</a></td>
              <td><a :href="getStatURL(note.markedBy.id)">{{note.markedBy.name}}</a></td>
              <td>{{note.content}}</td>
              <td>
                <span v-if="note.banned">Banned</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="column is-3">
        <template v-if="userdata">
          <h4 class="title is-4 has-text-centered">Admins</h4>
          <table class="table is-fullwidth">
            <thead>
              <tr>
                <th>SteamID</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="admin in admins" :key="admin.id">
                <td><a :href="getStatURL(admin.steamid)">{{admin.steamid}}</a></td>
                <td>{{admin.name || admin.comment}}</td>
              </tr>
            </tbody>
          </table>
        </template>
        <p v-else class="has-text-centered"><br><br>Login to view the admins</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onBeforeMount, onMounted } from 'vue'
import { Session } from '../../../common-types/User.js';

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

function fetchNotes() {
  fetch('/api/notes')
    .then(response => response.json())
    .then(result => {
      notes.value = result.notes
    })
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

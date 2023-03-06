<template>
<section class="modal-card-body">
  <div class="container has-text-centered" v-if="loading">
    <br>
    <p>Fetching notes... please wait</p>
    <br>
  </div>
  <template v-else-if="newNote">
    <div class="field">
      <label class="label">Message</label>
      <div class="control">
        <textarea class="textarea" placeholder="Enter note content"></textarea>
      </div>
    </div>
    <div class="field is-grouped">
      <div class="control">
        <button class="button is-primary" @click="addNote">Add Note</button>
      </div>
      <div class="control">
        <button class="button is-link is-light" @click='newNote = undefined'>Cancel</button>
      </div>
    </div>
  </template>
  <template v-else>
    <div class="container has-text-centered" v-if="notes.length == 0">
      <br>
      <p>User has no attached notes.</p>
      <p><a @click="startNewNote">Add a new note</a></p>
      <br>
    </div>
    <NoteComponent v-for="(note, i) in notes" :key="note.id" :note="note" @deleted="notes.splice(i, 1)" />
    <p v-if="notes.length > 0"><a @click="startNewNote" class="button is-info">Add a new note</a></p>
  </template>
</section>
</template>

<script setup lang="ts">
import { Note } from '../../../../../server/src/routes/!unprivileged/notes'
import { ref, onBeforeMount } from 'vue';
import NoteComponent from '@/components/manage-user/Note.vue'
import { PlayerData } from '@/js/User';
import { notify } from '@kyvg/vue3-notification';
import ActionNote from '@/components/ActionNote.vue'

let notes = ref<Note[]>([])
let loading = ref(false)
let newNote = ref()

const props = defineProps<{
  user: PlayerData
}>()

function startNewNote() {
  newNote.value = {
    content: null
  }
}

async function addNote() {
  loading.value = true
  try {
    const response = await fetch(`/api/notes/user/${props.user.steamid}`, {
      method: "POST",
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: newNote.value.content
      })
    })

    const json = await response.json()
    if(response.ok) {
      // Lazy, fetch all again:
      await fetchNotes()
      newNote.value = undefined
      loading.value = false
    } else {
      notify({
        type: "error",
        text: json.message,
        title: "Could not submit note"
      })
    }
  } catch(err: any) {
    notify({
      type: "error",
      text: err.message,
      title: "Could not submit note"
    })
  }
  loading.value = false
}

async function fetchNotes() {
  loading.value = true
  const response = await fetch(`/api/notes/user/${props.user.steamid}`)
  const json = await response.json()
  if(response.ok) {
    notes.value = json.notes
    loading.value = false
  } else {
    notify({
      type: "error",
      text: json.message,
      title: "Could not fetch notes"
    })
  }
}

onBeforeMount(async () => {
  await fetchNotes()
})
</script>

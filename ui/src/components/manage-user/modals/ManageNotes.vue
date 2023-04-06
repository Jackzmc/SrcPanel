<template>
<section class="modal-card-body">
  <div class="container has-text-centered" v-if="loading">
    <br>
    <Icon icon="spinner" spin>Fetching notes... please wait</Icon>
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
        <a class="button is-primary" @click="addNote" v-if="canAddNote">Add Note</a>
        <span class="has-text-danger" v-else>Something went wrong, you don't have access to create notes</span>
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
      <p v-if="canAddNote"><a @click="startNewNote">Add a new note</a></p>
      <p v-else class="has-text-danger">You lack the permissions to add notes</p>
      <br>
    </div>
    <div class="mb-5">
      <p v-if="notes.length > 0"><a class="button" :disabled="canAddNote ? undefined : true" @click="startNewNote"><Icon icon-class="has-text-success" icon="fa-note-sticky" button>New Note</Icon></a></p>
      <p class="has-text-danger" v-if="!canAddNote">You do not have the permission to add notes</p>
    </div>
    <div class="list has-visible-pointer-controls has-hoverable-list-items">
      <NoteComponent v-for="(note, i) in notes" :key="note.id" :note="note" :priv-user="privUser" @deleted="notes.splice(i, 1)" @change="onNoteChange" />
    </div>
    <br>
  </template>
</section>
</template>

<script setup lang="ts">
import { Note } from '../../../../../server/src/routes/!unprivileged/notes'
import { ref, onBeforeMount, computed } from 'vue';
import NoteComponent from '@/components/manage-user/Note.vue'
import { PlayerData } from '@/js/User';
import { notify } from '@kyvg/vue3-notification';
import { PrivilegedUser } from '@/js/User';
import { Action, Service } from '../../../../../common-types/Privileges';

let notes = ref<Note[]>([])
let loading = ref(false)
let newNote = ref()

const props = defineProps<{
  user: PlayerData,
  privUser: PrivilegedUser
}>()

const canAddNote = computed(() => {
  return props.privUser.canPerformAction(Service.Notes, Action.Create)
})

function startNewNote() {
  newNote.value = {
    content: null
  }
}

function onNoteChange(data: any) {
  if(!data.id) return
  for(const note of notes.value) {
    if(note.id === data.id) {
      note.content = data.content
      note.markedBy = data.markedBy
      break
    }
  }
}

async function addNote() {
  loading.value = true
  try {
    const response = await fetch(`/api/notes/${props.user.steamid}`, {
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

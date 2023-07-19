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
        <textarea class="textarea" placeholder="Enter note content" v-model="newNote.content"></textarea>
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
    <div class="mb-5 level">
      <div class="level-left">
        <p v-if="notes.length > 0" class="level-item">
          <a class="button has-tooltip-danger has-tooltip-right" @click="startNewNote"
            :disabled="canAddNote ? undefined : true"
            :data-tooltip="canAddNote ? undefined : 'You lack the permissions to add notes'"
          ><Icon icon-class="has-text-success" icon="fa-note-sticky" button>New Note</Icon></a>
        </p>
      </div>
      <div class="level-right">
        <p class="level-item has-tooltip-left has-tooltip-success" data-tooltip="Rate this player as good/helpful/friendly">
          <a @click="setRating(1)"
            :class="['button', {'is-active': rating.mine?.value === 1, 'is-loading': rating.loading, 'is-success': rating.mine?.value === 1 }]"
          >
            <Icon icon="fa-thumbs-up" button>{{ rating.thumbsUp }}</Icon>
          </a>
        </p>
        <p class="level-item has-tooltip-left has-tooltip-danger"  data-tooltip="Rate this player as bad/unfriendly">
          <a @click="setRating(-1)"
            :class="['button', {'is-active': rating.mine?.value === -1, 'is-loading': rating.loading, 'is-danger': rating.mine?.value === -1  }]"
          >
            <Icon icon="fa-thumbs-down" button>{{ rating.thumbsDown }}</Icon>
          </a>
        </p>
      </div>
    </div>
    <div class="list has-visible-pointer-controls has-hoverable-list-items">
      <NoteComponent v-for="(note, i) in notes" :key="note.id" :note="note" :priv-user="privUser" @deleted="notes.splice(i, 1)" @change="fetchNotes" />
    </div>
    <br>
  </template>
</section>
</template>

<script setup lang="ts">
import { Note } from '../../../../../common-types/Note.js'
import { ref, onBeforeMount, computed } from 'vue';
import NoteComponent from '@/components/manage-user/Note.vue'
import { PlayerData } from '@/js/User';
import { notify } from '@kyvg/vue3-notification';
import { PrivilegedUser } from '@/js/User';
import { Action, Service } from '../../../../../common-types/Privileges';

let notes = ref<Note[]>([])
let loading = ref(false)
let newNote = ref()
let rating = ref<{
  thumbsUp: number, thumbsDown: number, mine?: { id: string, value: number}, loading: boolean
}>({
  thumbsUp: 0,
  thumbsDown: 0,
  mine: undefined,
  loading: false
})

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

//spaghetti
async function setRating(value: number) {
  rating.value.loading = true
  if(rating.value.mine) {
    if(rating.value.mine.value !== value) {
      try {
        const response = await fetch(`/api/notes/${rating.value.mine.id}`, {
          method: "PUT",
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            content: value == 1 ? "+rep" : "-rep"
          })
        })

        const json = await response.json()
        if(response.ok) {
          loading.value = true
          // Lazy, fetch all again:
          await fetchNotes()
          loading.value = false
        } else {
          notify({
            type: "error",
            text: json.message,
            title: "Could not change rating"
          })
        }
      } catch(err: any) {
        notify({
          type: "error",
          text: err.message,
          title: "Could not change rating"
        })
      }
    } else {
      try {
        const response = await fetch(`/api/notes/${rating.value.mine.id}`, {
          method: "DELETE",
        })

        const json = await response.json()
        if(response.ok) {
          loading.value = true
          // Lazy, fetch all again:
          await fetchNotes()
          loading.value = false
        } else {
          notify({
            type: "error",
            text: json.message,
            title: "Could not remove rating"
          })
        }
      } catch(err: any) {
        notify({
          type: "error",
          text: err.message,
          title: "Could not remove rating"
        })
      }
    }
  } else {
    try {
      const response = await fetch(`/api/notes/${props.user.steamid}`, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: value == 1 ? "+rep" : "-rep"
        })
      })

      const json = await response.json()
      if(response.ok) {
        loading.value = true
        // Lazy, fetch all again:
        await fetchNotes()
        loading.value = false
      } else {
        notify({
          type: "error",
          text: json.message,
          title: "Could not submit rating"
        })
      }
    } catch(err: any) {
      notify({
        type: "error",
        text: err.message,
        title: "Could not submit rating"
      })
    }
  }
  rating.value.loading = false
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
    rating.value = {
      thumbsUp: 0,
      thumbsDown: 0,
      mine: undefined,
      loading: false
    }
    for(const note of json.notes) {
      if(note.content === "+rep") {
        rating.value.thumbsUp++
        if(note.markedBy.id.slice(10) === props.privUser.id.slice(10)) {
          rating.value.mine = {
            id: note.id,
            value: 1
          }
        }
      } else if(note.content === "-rep")  {
        rating.value.thumbsDown++
        if(note.markedBy.id.slice(10) === props.privUser.id.slice(10)) {
          rating.value.mine = {
            id: note.id,
            value: -1
          }
        }
      }

    }
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

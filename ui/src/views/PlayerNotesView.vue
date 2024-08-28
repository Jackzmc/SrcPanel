<template>
  <div class="container is-fluid">
    <div class="columns">
      <div class="column is-9">
        <div class="box" v-if="notes">
          <Pagination :page="page" :limit="limit" :count="notesCount" @page="setPage"></pagination>
          <div class="table-container" v-if="notes">
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
                  <td>
                    <UserComponent :user="note.client" />
                  </td>
                  <td>
                    <UserComponent :user="note.markedBy" />
                  </td>
                  <ActionNote :action="note.action" v-if="note.action" />
                  <td v-else>{{note.content}}</td>
                  <td>
                    <div class="tags">
                      <span v-if="note.action" class="tag is-success" data-tooltip="Has an automatic action">Action</span>
                      <span v-if="note.banned" class="tag is-danger">Banned</span>
                      <span v-if="note.client.id == note.markedBy.id" class="tag is-secondary"
                        data-tooltip="Note creator added note to themselves">Self-marked</span>
                      <span v-else-if="note.client.isAdmin" class="tag is-secondary"
                        data-tooltip="This note was added to an admin">Admin</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <template v-else>
            <div class="skeleton-block" v-for="i in 20" :key="i"></div>
          </template>
          <Pagination :page="page" :limit="limit" :count="notesCount" @page="setPage"></pagination>
        </div>
        <div class="mx-4" v-else-if="fetchError">
          <article class="message is-danger">
            <div class="message-header">
              <p>
                <Icon icon="fa-exclamation-triangle">Could not fetch notes</Icon>
              </p>
            </div>
            <div class="message-body">
              <p>While fetching player notes, an error occurred:</p>
              <p><pre>{{ fetchError }}</pre></p>
            </div>
          </article>
        </div>
        <div class="box has-text-centered py-6" v-else>
          <p class="subtitle is-2"><Icon icon="spinner" spin icon-class="mr-4">Fetching notes</Icon></p>
        </div>
      </div>
      <div class="column is-3">
        <div class="box has-background-info-light">
          <h3 class="title is-4" v-if="notes">
            Showing <input type="number" class="input" min=20 max=1000 step=10 style="width:6rem" v-model="limit"
              @blur="changeLimit" /> / {{ totalNotesCount.toLocaleString() }} Notes
            <em class="subtitle is-4" v-if="hasSearchQuery">({{ notesCount }} filtered)</em>
          </h3>
          <h3 class="title is-3" v-else>
            Showing - / - Notes
          </h3>
          <p class="subtitle mt-2">
            The color in the ID column represents their reputation.
          </p>
          <div class="box">
            <Field icon-left="fa-user" label="Search By User">
              <input class="input" v-model="search.user" :disabled="!notes" />
            </Field>
            <Field icon-left="fa-message" label="Search Note Message">
              <input class="input" v-model="search.content" :disabled="!notes" />
            </Field>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onBeforeMount, onMounted, computed, watch } from 'vue'
import ActionNote from '@/components/ActionNote.vue'
import Pagination from '@/components/Pagination.vue'
import Field from '@/components/Field.vue'
import data from '@/assets/data.json'
import Sentiment from 'sentiment'
import debounce from '@/js/debounce';
import { PrivilegedUser } from '@/js/User'
import UserComponent from '@/components/UserComponent.vue'
const sentiment = new Sentiment();
const analyzeOptions = {
  extras: data.sentimentWords
};

const props = defineProps<{
  privUser: PrivilegedUser
}>()

let page = ref(1)
let limit = ref(40)
let totalNotesCount = ref(0) // Absolute count, no filters
let notesCount = ref(0) // Count with filters
// notes.length: Count with filters, returned from pagination
let fetchError = ref<string|undefined>(undefined)
let notes = ref<any[] | undefined>(undefined)
let admins = ref<any[]>([])
let search = ref<{ user: string, content: string }>({ user: "", content: "" })

function setPage(value: number) {
  page.value = value
  fetchNotes()
}
function changeLimit() {
  if(limit.value < 20) limit.value = 20
  else if(limit.value > 1000) limit.value = 1000
  page.value = 1
  fetchNotes()
}

const hasSearchQuery = computed(() => {
  return search.value.user || search.value.content
})

watch(() => search.value, () => {
  console.log('search changed')
  debounceFetchNotes()
}, {deep: true})

async function fetchNotes() {
  notes.value = undefined
  try {
    const response = await fetch(`/api/notes?page=${page.value}&limit=${limit.value}&search_content=${search.value.content}&search_user=${search.value.user}`)
    const json = await response.json()
    if(response.ok) {
      notes.value = json.notes.map((note: any) => {
        note.content = note.content.trim()
        note.class = ["tag"]

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
      totalNotesCount.value = json.totalNotes
      notesCount.value = json.notesCount
    } else {
      fetchError.value = json.message
    }
  } catch(err: any) {
    fetchError.value = err.message
  }
}

const debounceFetchNotes = debounce(fetchNotes, 800)

function computeRating(content: string) {
  content = content.toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"")
    .replace(/\s{2,}/g," ");

  // Ideally analyzeOptions's extraWords should catch these, but its not:
  if(content == "+rep") return { key: "positive", score: 5}
  else if(content == "-rep") return { key: "negative", score: -5}

  const { score } = sentiment.analyze(content, analyzeOptions)
  let key = null
  if(score >= 2) key = "positive"
  else if(score <= -2) key = "negative"
  else if(score != 0) key = "neutral"
  return { key, value: score }
}

onMounted(() => {
  fetchNotes()
})
</script>

<style scoped>
@media screen and (min-width: 640px) {
  .table-container {
    overflow: inherit !important;
  }
}
</style>

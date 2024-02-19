<template>
<div class="container">
  <div class="columns">
    <div class="column is-8">
      <div class="block mb-2">
        <a @click="confirmCancel"><Icon icon="fa-arrow-left"  class="is-pulled-left" text="Back to discussions (cancel)" /></a>
      </div>
      <br>
      <div class="box question-box" v-if="loadState == LoadState.Success">
        <div class="taglist">
          <!-- <template v-if="discuss.closedAt">
            <span v-else class="tag is-link is-inline is-pulled-right">
              <Icon icon="fa-clock">Ends {{ expiresText }}</Icon>
            </span>
          </template> -->
        </div>
        <h5 class="title is-5"><b>Discuss:</b> <span contenteditable @blur="(event) => saveText('title', event as FocusEvent)" @keydown.enter.prevent="(event) => saveText('title', event as KeyboardEvent)">{{discuss.title}}</span></h5>
        <p class="subtitle" contenteditable @blur="(event) => saveText('description', event as FocusEvent)" @keydown.enter.prevent="(event) => saveText('description', event as KeyboardEvent)">{{ discuss.description }}</p>
        <div class="columns">
          <div class="column is-6">
            <div class="box field is-clickable" v-for="option of getOptions(0)" :key="option.id" @click="editOption(option)">
              <label>{{ option.label }}</label>
            </div>
            <a class="box field is-clickable has-background-info has-text-white has-text-centered" v-if="leftColumn" @click="editOption()"  data-tooltip="Click to create a new option">
              <Icon icon="fa-plus">New Option</Icon>
            </a>
          </div>
          <div class="column is-6">
            <div class="box field is-clickable" v-for="option of getOptions(1)" :key="option.id" @click="editOption(option)">
              <label>{{ option.label }}</label>
            </div>
            <a class="box field is-clickable has-background-info has-text-white has-text-centered" v-if="!leftColumn" @click="editOption()" data-tooltip="Click to create a new option">
              <Icon icon="fa-plus">New Option</Icon>
            </a>
          </div>
        </div>
      </div>
      <div class="box question-box" v-else>
        <router-link :to="{name: 'discuss'}"><Icon icon="fa-arrow-left" class="is-pulled-left" text="Back to discussions" /></router-link>
        <br>
        <p class="is-size-3 has-text-centered my-4 ml-3" v-if="loadState == LoadState.Loading"><Icon icon="fa-spinner" spin>Fetching discussion...</Icon></p>
        <p class="is-size-4 has-text-centered has-text-danger my-4" v-else><Icon icon="fa-times">An error occurred. Could not fetch discussion.</Icon></p>
      </div>
    </div>
    <div class="column" v-if="loadState == LoadState.Success">
      <h4 class="title is-4 mb-2">Options</h4>
      <div class="list has-visible-pointer-controls has-hoverable-list-items">
        <div class="list-item">
          <div class="list-item-content">
            <div class="list-item-title">
              <Icon icon="fa-info-circle" icon-class="has-text-info" text-left="Type" :data-tooltip="'Radio - only one option can be selected\nCheckbox - multiple items can be selected'"></Icon>
            </div>
          </div>
          <div class="list-item-controls">
            <div class="select">
              <select v-model="discuss.type">
                <option v-for="(display, type) in DISCUSSION_TYPES" :key="type" :value="type">
                  {{ display }}
                </option>
              </select>
            </div>
          </div>
        </div>
        <div class="list-item" v-if="!previouslyClosed">
          <div class="list-item-content">
            <div class="list-item-title">
              <Icon icon="fa-info-circle" icon-class="has-text-info no-border" text-left="Closes" data-tooltip="An optional time for the discussion to automatically close"></Icon>
            </div>
          </div>
          <div class="list-item-controls">
            <input :step="60*60" :min="new Date().toISOString().slice(0, -8)" class="input" type="datetime-local" v-model="closedAt">
            <a @click="discuss.closedAt = undefined" v-if="discuss.closedAt" class="is-pulled-right">clear closed at</a>
          </div>
        </div>
        <div class="list-item">
          <div class="list-item-content">
            <div class="list-item-title">
              <Icon icon="fa-info-circle" icon-class="has-text-info no-border" text-left="Voting" data-tooltip="If voting is open"></Icon>
            </div>
          </div>
          <div class="list-item-controls" v-if="previouslyClosed">
            <span class="tag is-danger is-inline is-pulled-right">
              <Icon icon="fa-clock">Closed</Icon>
            </span>
          </div>
          <div class="list-item-controls" v-else>
            <a @click="closeVoting"><Icon icon="fa-lock-open">Active</Icon> (click to close now)</a>
          </div>
        </div>
        <div class="list-item">
          <div class="list-item-content">
            <div class="list-item-title">
              <Icon icon="fa-info-circle" icon-class="has-text-info no-border" text-left="Responses" data-tooltip="Should the users who responded be shown publicly"></Icon>
            </div>
          </div>
          <div class="list-item-controls">
            <div class="field has-addons">
              <p class="control">
                <button :class="['button', {'is-info': (discuss.flags & APIDiscussionFlags.RespondersPublic) != 0}]" @click="toggleFlag(APIDiscussionFlags.RespondersPublic)">
                  <Icon icon="fa-eye">Public</Icon>
                </button>
              </p>
              <p class="control">
                <button :class="['button', {'is-info': (discuss.flags & APIDiscussionFlags.RespondersPublic) == 0}]" @click="toggleFlag(APIDiscussionFlags.RespondersPublic)">
                  <Icon icon="fa-eye-slash">Hidden</Icon>
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
      <br>
      <div class="buttons">
        <a :class="['button','is-success',{'is-loading': isSaving }]" @click="save" :disabled="isSaving ? true : undefined ">{{ isNew ? 'Create Discussion' : 'Save Changes' }}</a>
        <a class="button" @click="confirmCancel">Cancel</a>
        <a class="button is-warning" @click="archive"><Icon icon="fa-box-archive">Archive</Icon></a>
      </div>
    </div>
  </div>
</div>
</template>


<script setup lang="ts">
import { ref, computed, onMounted, Ref } from 'vue';
import { APIDiscussion, APIDiscussionType, APIDiscussionBase, APIDiscussionFlags, APIDiscussionOption } from '../../../common-types/Discussions';
import { useRoute, useRouter } from 'vue-router';
import { notify } from '@kyvg/vue3-notification';
import { request } from '@/js/util.js';

const DISCUSSION_TYPES: { [key in APIDiscussionType]?: string } = {
  [APIDiscussionType.Radio]: "Single Choice (Radio)",
  [APIDiscussionType.Checkbox]: "Multiple Choice (Checkbox)",
  // [APIDiscussionType.Selection]: "Selection",
  // [APIDiscussionType.ShortText]: "Short Text",
  // [APIDiscussionType.LongText]: "Long Text",
}
const isNew = computed(() => {
  return route.name === "discuss-new"
})
const closedAt = computed({
  get() {
    if(!discuss.value.closedAt) return
    return new Date(discuss.value.closedAt * 1000).toISOString().slice(0, -8)
  },
  set(newValue) {
    if(newValue) discuss.value.closedAt = Math.floor(new Date(newValue).getTime() / 1000 )
    else discuss.value.closedAt = undefined
  }
})
const previouslyClosed = computed(() => {
  return !isNew.value && orgDiscuss.value?.closedAt != undefined && discuss.value.closedAt == undefined
})
const hasChanges = computed(() => {
  if(isNew.value) return true
  // TODO: compare orgDiscuss vs discuss
  return true
})

const route = useRoute()
const router = useRouter()

const leftColumn = computed(() => {
  // if odd
  return discuss.value.options.length % 2 == 0
})
enum LoadState {
  Loading,
  Success,
  Error
}
const loadState = ref<LoadState>(LoadState.Loading)
const orgDiscuss = ref<APIDiscussionBase>()
const discuss = ref<APIDiscussionBase>({
  title: "",
  description: 'A short optional description',
  type: APIDiscussionType.Radio,
  closedAt: 0,
  timestamp: Date.now(),
  options: [],
  flags: 0,
})
const isSaving = ref(false)

function toggleFlag(flag: APIDiscussionFlags) {
  discuss.value.flags = discuss.value.flags ^ flag
}

let dummyId = 0
function editOption(option?: APIDiscussionOption) {
  const name = prompt("Enter option name", option?.label)
  if(!name) return
  if(option) {
    option.label = name
  } else {
    discuss.value.options.push({
      label: name,
      id: dummyId++
    })
  }
}

function confirmCancel() {
  if(confirm("Are you sure you want to cancel?")) {
    router.push({ name: "discuss" })
  }
}

function closeVoting() {
  if(confirm("Are you sure you want to close this discussion? You will not be able to reopen it.")) {
    discuss.value.closedAt = Math.round(Date.now() / 1000)
  }
}

async function archive() {
  if(confirm("Are you sure you want to archive this discussion?")) {
    discuss.value.flags |= APIDiscussionFlags.Archived
    await save()
  }
}

function getOptions(column: number) {
  let options = discuss.value.options
  if(column == 0) {
    return options.filter((v, i) => !(i % 2))
  } else {
    return options.filter((v, i) => i % 2)
  }
}

async function save() {
  isSaving.value = true
  let response
  let id = route.params.id
  if(isNew.value) {
    response = await fetch("/api/discussions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(discuss.value) })
    const json = await response.json()
    id = json.id
  } else {
    response = await fetch(`/api/discussions/${route.params.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(discuss.value) })
  }
  isSaving.value = false
  if(response?.ok) {
    notify({
      title: `Discussion #${id}`,
      text: isNew.value ? 'Discussion Created' : 'Discussion Saved',
      type: "success"
    })
    router.push({ name: "discuss" })
  }
}

function saveText(field: keyof APIDiscussionBase, event: any) {
  //@ts-ignore stupid indexing by a string
  discuss.value[field] = event.target.innerText.trim() ?? ""
  event.target.blur()
}
onMounted(async() => {
  discuss.value.title = route.query.title?.toString() ?? "Discussion Title"
  router.replace({
    query: {
      title: undefined
    }
  })
  if(!isNew.value) {
    const response = await request(`/api/discussions/${route.params.id}`)
    if(response?.ok) {
      loadState.value = LoadState.Success
      discuss.value = await response.json()
      orgDiscuss.value = JSON.parse(JSON.stringify(discuss.value))
    } else {
      loadState.value = LoadState.Error
    }
  }
})
</script>

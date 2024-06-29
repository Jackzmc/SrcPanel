<template>
<div class="container">
  <div class="columns">
    <div class="column is-8">
      <div class="block mb-2">
        <a @click="confirmCancel"><Icon icon="fa-arrow-left"  class="is-pulled-left" text="Back to discussions (cancel)" /></a>
      </div>
      <br>
      <div class="box question-box" v-if="loadState == LoadState.Success">
        <h5 class="title is-5"><b>Discuss:</b> <span class="has-tooltip-left" data-tooltip="Click to edit" contenteditable @blur="(event) => saveText('title', event as FocusEvent)" @keydown.enter.prevent="(event) => saveText('title', event as KeyboardEvent)">{{discuss.title}}</span></h5>
        <!-- <p data-tooltip="Click to edit" class="subtitle" contenteditable @blur="(event) => saveText('description', event as FocusEvent)" @keydown.enter.prevent="(event) => saveText('description', event as KeyboardEvent)" @click="onDescriptionClick">
          <template v-if="discuss.description != ''">{{ discuss.description }}</template>
          <em v-else>Click here to add a description</em>
        </p> -->
        <input ref="descriptionForm" type="text" class="input subtitle is-small" v-model="discuss.description" placeholder="Add a description" v-if="editingDesc" @keyup.enter="setEditingDesc(false)" @blur="setEditingDesc(false)" />
        <FormatText markdown data-tooltip="Click to edit"  class="subtitle has-tooltip-left" v-else-if="discuss.description" :text="discuss.description" @click="setEditingDesc(true)" />
        <p v-else  class="subtitle is-clickable" @click="setEditingDesc(true)"><em>Click here to add a description</em></p>
        <div class="columns" v-if="discuss.type == APIDiscussionType.Radio || discuss.type == APIDiscussionType.Checkbox">
          <div class="column is-6">
            <div class="box field is-clickable" v-for="option of getOptions(0)" :key="option.id" @click="editOption(option)">
              <label>{{ option.label }}</label>
            </div>
            <a class="box field is-clickable has-background-info has-text-white has-text-centered" v-if="leftColumn&&!previouslyClosed" @click="editOption()"  data-tooltip="Click to create a new option">
              <Icon icon="fa-plus">New Option</Icon>
            </a>
          </div>
          <div class="column is-6">
            <div class="box field is-clickable" v-for="option of getOptions(1)" :key="option.id" @click="editOption(option)">
              <label>{{ option.label }}</label>
            </div>
            <a class="box field is-clickable has-background-info has-text-white has-text-centered" v-if="!leftColumn&&!previouslyClosed" @click="editOption()" data-tooltip="Click to create a new option">
              <Icon icon="fa-plus">New Option</Icon>
            </a>
          </div>
        </div>
        <div v-else-if="discuss.type == APIDiscussionType.ShortText">
          <Field>
            <input type="text" class="input" readonly placeholder="Enter your submission">
          </Field>
        </div>
        <div v-else-if="discuss.type == APIDiscussionType.LongText">
          <Field>
            <textarea type="text" class="textarea" readonly placeholder="Enter your submission"></textarea>
          </Field>
        </div>
      </div>
      <div class="box question-box" v-else>
        <router-link :to="{name: 'discuss'}"><Icon icon="fa-arrow-left" class="is-pulled-left" text="Back to discussions" /></router-link>
        <br>
        <p class="is-size-3 has-text-centered my-4" v-if="loadState == LoadState.Loading"><Icon icon="fa-spinner" icon-class="mr-4" spin>Fetching discussion...</Icon></p>
        <p class="is-size-4 has-text-centered has-text-danger my-4" v-else><Icon icon="fa-times">An error occurred. Could not fetch discussion.</Icon></p>
      </div>
      <p class="has-text-danger" v-for="(error, i) in validationErrors" :key="i">
        <Icon icon="fa-exclamation-triangle">{{ error }}</Icon>
      </p>
    </div>
    <div class="column" v-if="loadState == LoadState.Success">
      <h4 class="title is-4 mb-2">Discussion Settings</h4>
      <div class="list has-visible-pointer-controls has-hoverable-list-items">
        <div class="list-item">
          <div class="list-item-content">
            <div class="list-item-title">
              <Icon icon="fa-info-circle" icon-class="has-text-info no-border" text-left="Type" :data-tooltip="'Radio - only one option can be selected\nCheckbox - multiple items can be selected'"></Icon>
            </div>
          </div>
          <div class="list-item-controls">
            <div class="select">
              <select v-model="discuss.type">
                <option v-for="(display, type) in DISCUSSION_TYPES" :key="type" :value="Number(type)">
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
            <template v-if="discuss.closedAt">
              <input style="width:inherit" :step="60*60" :min="new Date().toISOString().slice(0, -8)" class="input" type="datetime-local" v-model="closedAt">
              <p><a @click="discuss.closedAt = 0" class="is-pulled-right">clear date</a></p>
            </template>
            <span v-else>Never <a class="ml-4 button is-small is-info" @click="setClosedAt">Set Date</a></span>
          </div>
        </div>
        <div class="list-item" v-if="!isNew">
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
              <Icon icon="fa-info-circle" icon-class="has-text-info no-border" text-left="Respondants" data-tooltip="Should the names of the users who responded be public?"></Icon>
            </div>
          </div>
          <div class="list-item-controls">
            <div class="field has-addons">
              <p class="control">
                <button :class="['button', {'is-info': hasFlag(APIDiscussionFlags.RespondersPublic)}]" @click="setFlag(APIDiscussionFlags.RespondersPublic, true)">
                  <Icon icon="fa-eye">Public</Icon>
                </button>
              </p>
              <p class="control">
                <button :class="['button', {'is-info': !hasFlag(APIDiscussionFlags.RespondersPublic)}]" @click="setFlag(APIDiscussionFlags.RespondersPublic, false)">
                  <Icon icon="fa-eye-slash">Hidden</Icon>
                </button>
              </p>
            </div>
          </div>
        </div>
        <div class="list-item" v-if="(discuss.flags & APIDiscussionFlags.RespondersPublic) != 0">
          <div class="list-item-content">
            <div class="list-item-title">
              <Icon icon="fa-info-circle" icon-class="has-text-info no-border" text-left="Responses" data-tooltip="Should the users' responses be public?"></Icon>
            </div>
          </div>
          <div class="list-item-controls">
            <div class="field has-addons">
              <p class="control">
                <button :class="['button', {'is-info': hasFlag(APIDiscussionFlags.ResponsesPublic)}]" @click="setFlag(APIDiscussionFlags.ResponsesPublic, true)">
                  <Icon icon="fa-eye">Public</Icon>
                </button>
              </p>
              <p class="control">
                <button :class="['button', {'is-info': !hasFlag(APIDiscussionFlags.ResponsesPublic)}]" @click="setFlag(APIDiscussionFlags.ResponsesPublic, false)">
                  <Icon icon="fa-eye-slash">Hidden</Icon>
                </button>
              </p>
            </div>
          </div>
        </div>
        <div class="list-item" v-if="(discuss.flags & APIDiscussionFlags.RespondersPublic) != 0">
          <div class="list-item-content">
            <div class="list-item-title">
              <Icon icon="fa-info-circle" icon-class="has-text-info no-border" text-left="Comments" data-tooltip="Should comments be anonymous?"></Icon>
            </div>
          </div>
          <div class="list-item-controls">
            <div class="field has-addons">
              <p class="control">
                <button :class="['button', {'is-info': hasFlag(APIDiscussionFlags.CommentsPublic)}]" @click="setFlag(APIDiscussionFlags.CommentsPublic, true)">
                  <Icon icon="fa-eye">Public</Icon>
                </button>
              </p>
              <p class="control">
                <button :class="['button', {'is-info': !hasFlag(APIDiscussionFlags.CommentsPublic)}]" @click="setFlag(APIDiscussionFlags.CommentsPublic, false)">
                  <Icon icon="fa-eye-slash">Anonymous</Icon>
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
      <br>
      <div class="buttons">
        <a :class="['button','is-success','has-text-white',{'is-loading': isSaving }]" @click="save" :disabled="canSave ? undefined : true ">{{ isNew ? 'Create Discussion' : 'Save Changes' }}</a>
        <a class="button" @click="confirmCancel">Cancel</a>
        <a v-if="!isNew" class="button is-warning" @click="archive"><Icon icon="fa-box-archive">Archive</Icon></a>
      </div>
    </div>
  </div>
</div>
</template>


<script setup lang="ts">
import { ref, computed, onMounted, Ref, watch, nextTick } from 'vue';
import { APIDiscussion, APIDiscussionType, APIDiscussionBase, APIDiscussionFlags, APIDiscussionOption } from '../../../common-types/Discussions';
import { useRoute, useRouter } from 'vue-router';
import { notify } from '@kyvg/vue3-notification';
import { request } from '@/js/util.js';
import Field from '@/components/Field.vue';
import { format } from 'date-fns'
import FormatText from '@/components/FormatText.vue';

const DISCUSSION_TYPES: { [key in APIDiscussionType]?: string } = {
  [APIDiscussionType.Radio]: "Single Choice (Radio)",
  [APIDiscussionType.Checkbox]: "Multiple Choice (Checkbox)",
  // [APIDiscussionType.Selection]: "Selection",
  [APIDiscussionType.ShortText]: "Short Text",
  [APIDiscussionType.LongText]: "Essay (Long Text)",
}
const isNew = computed(() => {
  return route.name === "discuss-new"
})
const closedAt = computed({
  get() {
    if(discuss.value.closedAt == 0) return null
    return format(new Date(discuss.value.closedAt * 1000), "uuuu-LL-dd'T'HH:mm:s")
  },
  set(newValue) {
    if(newValue) discuss.value.closedAt = Math.floor(new Date(newValue).getTime() / 1000 )
    else discuss.value.closedAt = 0
  }
})
const previouslyClosed = computed(() => {
  if(!orgDiscuss.value) return
  return !isNew.value && orgDiscuss.value.closedAt != 0 && (Date.now() > (orgDiscuss.value.closedAt*1000) || discuss.value.closedAt == 0)
})
const hasChanges = computed(() => {
  if(isNew.value) return true
  // TODO: compare orgDiscuss vs discuss
  return true
})
const validationErrors = computed(() => {
  const errors = []
  if(discuss.value.type === APIDiscussionType.Checkbox || discuss.value.type === APIDiscussionType.Radio) {
    if(!discuss.value.options || discuss.value.options.length < 2) errors.push("Must have at least 2 options")
  }
  return errors
})
const canSave = computed(() => {
  if(isSaving.value) return false
  return validationErrors.value.length === 0
})

const route = useRoute()
const router = useRouter()

const leftColumn = computed(() => {
  // if odd
  return discuss.value.options!.length % 2 == 0
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
  description: '',
  type: APIDiscussionType.Radio,
  closedAt: 0,
  timestamp: Date.now(),
  options: [],
  flags: APIDiscussionFlags.CommentsPublic | APIDiscussionFlags.RespondersPublic,
})
const isSaving = ref(false)
const editingDesc = ref(false)
const descriptionForm = ref()

function setFlag(flag: APIDiscussionFlags, state: boolean) {
  if(state) {
    discuss.value.flags |= flag;
  } else {
    discuss.value.flags &= ~flag;
  }
}
function hasFlag(flag: APIDiscussionFlags) {
  return (discuss.value.flags & flag) != 0
}
function setEditingDesc(value: boolean) {
  editingDesc.value = value
  if(value) {
    nextTick(() => {
      descriptionForm.value.focus()
    })
  }
}

let dummyId = 0
function editOption(option?: APIDiscussionOption) {
  const name = prompt("Enter option name", option?.label)
  if(!name) return
  if(option) {
    option.label = name
  } else {
    discuss.value.options!.push({
      label: name,
      id: dummyId++
    })
  }
}
function onDescriptionClick(e: any) {
  e.target.textContent = discuss.value.description
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
    return options!.filter((v, i) => !(i % 2))
  } else {
    return options!.filter((v, i) => i % 2)
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
function setFlagFromQuery(query: string, flag: APIDiscussionFlags) {
  if(query === "shown" || query === "visible" || query === "1") {
    discuss.value.flags |= flag
  } else if(query === "hide" || query === "hidden" || query === "0") {
    discuss.value.flags &= ~flag
  }
}
function setClosedAt() {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  //@ts-expect-error closedAt get is string, set is number/date
  closedAt.value = d
}
onMounted(async() => {
  discuss.value.title = route.query.title?.toString() ?? "Discussion Title"
  discuss.value.description = route.query.description?.toString() ?? "";
  setFlagFromQuery(route.query.respondants as string, APIDiscussionFlags.RespondersPublic)
  setFlagFromQuery(route.query.responses as string, APIDiscussionFlags.ResponsesPublic)
  setFlagFromQuery(route.query.comments as string, APIDiscussionFlags.CommentsPublic)
  if(route.query.type) {
    switch(route.query.type) {
      case "radio": discuss.value.type = APIDiscussionType.Radio; break;
      case "checkbox": discuss.value.type = APIDiscussionType.Checkbox; break;
      case "text": discuss.value.type = APIDiscussionType.ShortText; break;
      case "essay": discuss.value.type = APIDiscussionType.LongText; break;
    }
  }

  if(!isNew.value) {
    const response = await request(`/api/discussions/${route.params.id}`)
    if(response?.ok) {
      loadState.value = LoadState.Success
      discuss.value = await response.json()
      orgDiscuss.value = JSON.parse(JSON.stringify(discuss.value))
    } else {
      loadState.value = LoadState.Error
    }
  } else {
    loadState.value = LoadState.Success
  }
})
</script>

<style scoped>
span[data-tooltip] {
  border: 0;
}
</style>

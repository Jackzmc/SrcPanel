<template>
<div class="container">
  <div class="columns">
    <div class="column is-8">
      <div class="box question-box">
        <div class="taglist">
          <template v-if="discuss.expires">
            <!-- <span v-else class="tag is-link is-inline is-pulled-right">
              <Icon icon="fa-clock">Ends {{ expiresText }}</Icon>
            </span> -->
          </template>
        </div>
        <h5 class="title is-5"><b>Discuss:</b> <span contenteditable @keydown.enter.prevent="(event) => saveText('title', event as KeyboardEvent)">{{discuss.title}}</span></h5>
        <p class="subtitle" contenteditable @keydown.enter.prevent="(event) => saveText('description', event as KeyboardEvent)">{{ discuss.description }}</p>
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
    </div>
    <div class="column">
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
        <div class="list-item">
          <div class="list-item-content">
            <div class="list-item-title">
              <Icon icon="fa-info-circle" icon-class="has-text-info" text-left="Expires" data-tooltip="An optional time for the discussion to automatically close"></Icon>
            </div>
          </div>
          <div class="list-item-controls">
            <input :step="60*60" :min="new Date().toISOString().slice(0, -8)" class="input" type="datetime-local" v-model="expires">
            <a @click="discuss.expires = undefined" v-if="discuss.expires" class="is-pulled-right">clear expired</a>
          </div>
        </div>
        <div class="list-item">
          <div class="list-item-content">
            <div class="list-item-title">
              <Icon icon="fa-info-circle" icon-class="has-text-info" text-left="Responses" data-tooltip="Should the users who responded be shown publicly"></Icon>
            </div>
          </div>
          <div class="list-item-controls">
            <div class="field has-addons">
              <p class="control">
                <button :class="['button', {'is-info': (discuss.flags & APIDiscussionFlags.PublicResponses) != 0}]" @click="toggleFlag(APIDiscussionFlags.PublicResponses)">
                  <Icon icon="fa-eye">Public</Icon>
                </button>
              </p>
              <p class="control">
                <button :class="['button', {'is-info': (discuss.flags & APIDiscussionFlags.PublicResponses) == 0}]" @click="toggleFlag(APIDiscussionFlags.PublicResponses)">
                  <Icon icon="fa-eye-slash">Private</Icon>
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

const DISCUSSION_TYPES: { [key in APIDiscussionType]?: string } = {
  [APIDiscussionType.Radio]: "Radio",
  [APIDiscussionType.Checkbox]: "Checkbox",
  // [APIDiscussionType.Selection]: "Selection",
  // [APIDiscussionType.ShortText]: "Short Text",
  // [APIDiscussionType.LongText]: "Long Text",
}
const isNew = computed(() => {
  return route.name === "discuss-new"
})
const expires = computed({
  get() {
    if(!discuss.value.expires) return
    return new Date(discuss.value.expires * 1000).toISOString().slice(0, -8)
  },
  set(newValue) {
    if(newValue) discuss.value.expires = Math.floor(new Date(newValue).getTime() / 1000 )
    else discuss.value.expires = undefined
  }
})

const route = useRoute()
const router = useRouter()

const leftColumn = computed(() => {
  // if odd
  return discuss.value.options.length % 2 == 0
})

const discuss = ref<APIDiscussionBase>({
  title: "",
  description: 'A short optional description',
  type: APIDiscussionType.Radio,
  expires: 0,
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
  if(isNew.value) {
    response = await fetch("/api/discussions", { method: "POST", body: JSON.stringify(discuss.value) })
  } else {
    response = await fetch(`/api/discussions/${route.params.id}`, { method: "PUT", body: JSON.stringify(discuss.value) })
  }
  isSaving.value = false
  if(response?.ok) {
    notify({
      title: `${isNew.value ? 'Discussion Created' : 'Discussion Saved'}`,
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
    const response = await fetch(`/api/discussions/${route.params.id}`)
    if(response?.ok) {
      discuss.value = await response.json()
    }
  }
})
</script>

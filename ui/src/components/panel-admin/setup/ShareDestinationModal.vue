<template>
  <ModalCard :title="title" hide-footer @close="cancel">
    <template #title>
      <b>{{ share.name || share.id || "Unnamed Share" }}</b> / Destinations
    </template>
    <div class="tabs is-fullwidth is-centered">
      <ul>
        <li v-for="(dest, id) in share.destinations" :key="id" :class="{'is-active': selectedId == id }">
          <a @click="select(id)">{{ dest.name ?? id }}</a>
        </li>
        <li :class="{'is-active': !selectedId }"><a class="has-text-info" @click="select(null)"><Icon icon="fa-plus">New</Icon></a></li>
      </ul>
    </div>

    <template v-if="destination">
      <div class="columns">
        <div class="column is-6">
          <Field label="Id*">
            <template v-if="!destId" #hint_error>
              <p class="help has-text-danger"><Icon icon="fa-exclamation-triangle">Required</Icon></p>
            </template>
            <input v-model="destId" required :class="['input',{'is-danger': !destId }]" type="text" placeholder="A unique identifier" />
          </Field>
        </div>
        <div class="column is-6">
          <Field label="Name">
            <input v-model="destination.name" required class="input" type="text" placeholder="An optional friendly name" @change="onEnterName" />
          </Field>
        </div>
      </div>

      <Field label="Paths*">
        <Field>
          <input v-model="destination!.paths[0]" required type="text" :class="['input',{'is-danger': destination.paths.length === 0 || destination.paths[0] == ''}]" placeholder="/var/shares/my-share/addons">
          <p v-if="destination.paths.length === 0 || destination.paths[0] == ''" class="help has-text-danger"><Icon icon="fa-exclamation-triangle">At least one path is required</Icon></p>
        </Field>
        <template v-if="destination.paths.length > 1">
          <div v-for="i in destination.paths.length - 2" :key="i" class="field has-addons">
            <div class="control is-expanded">
              <input v-model="destination.paths[i+1]" required type="text" :class="['input',{'is-danger': destination.paths[i+1] == ''}]" placeholder="/var/shares/my-share/addons">
            </div>
            <div class="control">
              <button class="button is-danger" @click="destination!.paths.splice(i+1, 1)">
                <Icon icon="fa-trash" />
              </button>
            </div>
          </div>
        </template>
        <p><a class="button is-outlined is-success mt-4" @click="destination!.paths.push('')"><Icon icon="fa-plus">Add Path</Icon></a></p>
      </Field>
      <Field label="Servers">
        <!-- <input class="input" type="text" placeholder="Choose Tags" value="One,Two" :data-source="availableServers"> -->
        <div :class="['control',{'is-loading': !availableServers}]">
          <!-- FIXME: when destination.serverIds changes, the list doesn't update -->
          <!-- Possibly v-if to reset it, or rerun js-->
          <select v-if="destination.serverIds" ref="element" v-model="destination.serverIds" :disabled="!availableServers" multiple data-type="tags" data-placeholder="Choose Tags" data-selectable="false" :data-source="availableServers">
            <option v-for="(server) in availableServers" :key="server.id" :value="server.id" selected>{{ server.name ?? server.id }}</option>
          </select>
        </div>
      </Field>
      <br><br>
    </template>
    <div v-else class="container has-text-centered">
      <p class="subtitle">No destinations exist</p>
      <p><a class="button is-outlined is-info" @click="startDestination">New Destination</a></p>
    </div>

    <template #buttons>
      <template v-if="selectedId">
        <button v-if="hasEdited" class="button is-success has-text-white" :disabled="!canSubmit">Save Changes</button>
        <button :class="['button',{'is-warning': hasEdited}]" @click="cancel">{{ hasEdited ? 'Cancel' : 'Close' }}</button>
      </template>
      <template v-else>
        <button class="button is-success has-text-white" :disabled="!canSubmit">Add Destination</button>
        <button :class="['button',{'is-warning': destination != undefined}]" @click="cancel">Cancel</button>
      </template>
    </template>
  </ModalCard>
  </template>

<script setup lang="ts">
import Field from '@/components/Field.vue'
import ModalCard from '@/components/ModalCard.vue';
import { ShareDestination, ShareInfo } from '../../../../../common-types/Share.js';
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue';
import { updatedDiff } from 'deep-object-diff'
// @ts-expect-error no types
import BulmaTagsInput from '@creativebulma/bulma-tagsinput';
import { request } from '@/js/util.js';

const emit = defineEmits(["close"])

const props = defineProps<{
  share: ShareInfo
}>()
let availableServers = ref<{ id: string, name?: string}[]>()
let destination = ref<ShareDestination>()
let destId = ref<string>()
let selectedId = ref<string|null>()
let element = ref()
let tagListInstance: BulmaTagsInput

const title = computed(() => {
  return `${props.share.name} > Destinations`
})

const hasEdited = computed(() => {
  if(!destination.value) return false
  if(!selectedId.value) return true
  if(selectedId.value != destId.value) return true
  return Object.keys(updatedDiff(props.share.destinations[selectedId.value], destination.value)).length > 0
})
const validationErrors = computed(() => {
  const errors = []
  if(!destId.value) errors.push("An unique identifier is required")
  if(destination.value?.paths.length === 0 || destination.value?.paths[0] == "") errors.push("At least one path is required")
  return errors
})

const canSubmit = computed(() => {
  return validationErrors.value.length === 0
})

function select(id: string | null) {
  if(hasEdited.value) {
    if(!confirm(`You have unchanged changes to ${destination.value?.name || destId.value || '(new destination)'}, are you sure you want to cancel?`)) return
  }

  selectedId.value = id
  destId.value = id ?? ""
  let dest = {
    name: "",
    paths: [""],
    serverIds: []
  }
  if(id && props.share.destinations[id]) {
    dest = { ... dest, ... JSON.parse(JSON.stringify(props.share.destinations[id])) }
  }
  destination.value = dest
  nextTick(() => {
    if(tagListInstance) {
      console.log("flush")
      tagListInstance.removeAll()
    } else {
      tagListInstance = new BulmaTagsInput(element.value)
    }
  })
}

function onEnterName() {
  if(!destId.value) {
    destId.value = destination.value?.name?.toLowerCase().replace(/[^a-zA-Z0-9- ]/g, '').replace(/[\s]/g, '-')
  }
}
function startDestination() {
  select(null)
}

function cancel() {
  if(hasEdited.value) {
    if(!confirm(`You have unchanged changes to ${destination.value?.name || destId.value || '(new destination)'}, are you sure you want to cancel?`)) return
  }
  emit('close')
}

async function fetchServers() {
  const response = await request('/api/servers?compact=1', undefined)
  if(response?.ok) {
    availableServers.value = await response.json()
  }
}

onMounted(async() => {
  const instances = BulmaTagsInput.attach()
  console.log('instances', instances)
  await fetchServers()

})
</script>

<style>
@import 'node_modules/@creativebulma/bulma-tagsinput/dist/css/bulma-tagsinput.min.css';
</style>

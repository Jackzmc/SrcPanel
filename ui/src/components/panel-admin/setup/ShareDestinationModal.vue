<template>
  <ModalCard :title="title" hide-footer @close="cancel">
    <template v-slot:title>
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
    <div class="columns">
      <div class="column is-6">
        <Field label="Id*">
          <template v-slot:hint_error v-if="!destId">
            <p class="help has-text-danger"><Icon icon="fa-exclamation-triangle">Required</Icon></p>
          </template>
          <input required :class="['input',{'is-danger': !destId }]" type="text" placeholder="A unique identifier" v-model="destId" />
        </Field>
      </div>
      <div class="column is-6">
        <Field label="Name">
          <input required class="input" type="text" placeholder="An optional friendly name" v-model="destination.name" @change="onEnterName" />
        </Field>
      </div>
    </div>

    <Field label="Paths*">
      <Field>
        <input required type="text" :class="['input',{'is-danger': destination.paths.length === 0 || destination.paths[0] == ''}]" placeholder="/var/shares/my-share/addons" v-model="destination.paths[0]" >
        <p class="help has-text-danger" v-if="destination.paths.length === 0 || destination.paths[0] == ''" ><Icon icon="fa-exclamation-triangle">At least one path is required</Icon></p>
      </Field>
      <template v-if="destination.paths.length > 1">
        <div class="field has-addons" v-for="i in destination.paths.length - 2" :key="i" >
          <div class="control is-expanded">
            <input required type="text" :class="['input',{'is-danger': destination.paths[i+1] == ''}]" placeholder="/var/shares/my-share/addons" v-model="destination.paths[i+1]">
          </div>
          <div class="control">
            <button class="button is-danger" @click="destination.paths.splice(i+1, 1)">
              <Icon icon="fa-trash" />
            </button>
          </div>
        </div>
      </template>
      <p><a class="button is-outlined is-success mt-4" @click="destination.paths.push('')"><Icon icon="fa-plus">Add Path</Icon></a></p>
    </Field>
    <Field label="Servers">
      <!-- <input class="input" type="text" placeholder="Choose Tags" value="One,Two" :data-source="availableServers"> -->
      <div class="control">
        <select multiple data-type="tags" data-placeholder="Choose Tags" v-model="destination.serverIds" data-selectable="false" :data-source="availableServers">
          <option v-for="(server) in availableServers" :key="server.id" :value="server.id" selected>{{ server.name ?? server.id }}</option>
        </select>
      </div>
    </Field>
    <br><br>

    <template v-slot:buttons>
      <template v-if="selectedId">
        <button class="button is-success has-text-white" :disabled="!canSubmit" v-if="hasEdited">Save Changes</button>
        <button :class="['button',{'is-warning': hasEdited}]" @click="cancel">{{ hasEdited ? 'Cancel' : 'Close' }}</button>
      </template>
      <template v-else>
        <button class="button is-success has-text-white" :disabled="!canSubmit">Add Destination</button>
        <button class="button is-warning" @click="cancel">Cancel</button>
      </template>
    </template>
  </ModalCard>
  </template>

<script setup lang="ts">
import Field from '@/components/Field.vue'
// @ts-expect-error
import { Tab, Tabs } from 'vue3-tabs-component'
import ModalCard from '@/components/ModalCard.vue';
import { ShareDestination, ShareInfo } from '../../../../../common-types/Share.js';
import { computed, onMounted, onUnmounted, ref } from 'vue';
// @ts-expect-error
import { updatedDiff } from 'deep-object-diff'
// @ts-expect-error
import BulmaTagsInput from '@creativebulma/bulma-tagsinput';

const emit = defineEmits(["close"])

const props = defineProps<{
  share: ShareInfo
}>()
let availableServers = ref<{ id: string, name?: string}[]>([{id: "server-1"},{id: "server-2",name: "Server 2"},{id:"server-3",name: "Server 3"}])
let destination = ref<ShareDestination>({
  name: "",
  paths: [""],
  serverIds: ["dummy","test"]
})
let destId = ref<string>()
let selectedId = ref<string|null>()

const title = computed(() => {
  return `${props.share.name} > Destinations`
})

const hasEdited = computed(() => {
  if(!selectedId.value) return true
  if(selectedId.value != destId.value) return true
  return Object.keys(updatedDiff(props.share.destinations[selectedId.value], destination.value)).length > 0
})
const validationErrors = computed(() => {
  const errors = []
  if(!destId.value) errors.push("An unique identifier is required")
  if(destination.value.paths.length === 0 || destination.value.paths[0] == "") errors.push("At least one path is required")
  return errors
})

const canSubmit = computed(() => {
  return validationErrors.value.length === 0
})

function select(id: string | null) {
  selectedId.value = id
  destId.value = id ?? ""
  if(id)
    destination.value = JSON.parse(JSON.stringify(props.share.destinations[id]))
  else
    destination.value = {
      name: "",
      paths: [""],
      serverIds: []
    }
}

function onEnterName() {
  if(!destId.value) {
    destId.value = destination.value.name?.toLowerCase().replace(/[^a-zA-Z0-9- ]/g, '').replace(/[\s]/g, '-')
  }
}

function cancel() {
  if(hasEdited.value) {
    if(!confirm(`You have unchanged changes to ${destination.value.name || destId.value || '(new destination)'}, are you sure you want to cancel?`)) return
  }
  emit('close')
}

onMounted(() => {
  BulmaTagsInput.attach()
})
</script>

<style>
@import 'node_modules/@creativebulma/bulma-tagsinput/dist/css/bulma-tagsinput.min.css';
</style>

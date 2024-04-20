<template>
<ModalCard title="Add Share" @close="emit('close')">
  <!-- <ShareDestinationModal :share="share" /> -->
  <div class="tabs is-fullwidth is-centered">
    <ul>
      <li v-for="(name, tab) in TAB_IDS" :key="tab" :class="{'is-active': selectedTab === tab }"><a @click="selectTab(tab)">{{ name }}</a></li>
    </ul>
  </div>
  <template v-if="selectedTab === 'general'">
    <div class="columns">
      <div class="column is-6">
        <Field label="Id*">
          <template v-slot:hint_error v-if="!share.id">
            <p class="help has-text-danger"><Icon icon="fa-exclamation-triangle">Required</Icon></p>
          </template>
          <input required :class="['input',{'is-danger': !share.id }]" type="text" placeholder="A unique identifier" v-model="share.id" />
        </Field>
      </div>
      <div class="column is-6">
        <Field label="Name">
          <input required class="input" type="text" placeholder="An optional friendly name" v-model="share.name" @change="onEnterName" />
        </Field>
      </div>
    </div>
    <Field label="Source Directory Path*">
      <template v-slot:hint_error v-if="!share.sourceFolder">
        <p class="help has-text-danger"><Icon icon="fa-exclamation-triangle">Required</Icon></p>
      </template>
      <input required :class="['input',{'is-danger': !share.sourceFolder}]" type="text" placeholder="/home/steam/content/addons" v-model="share.sourceFolder" />
    </Field>
  </Template>
  <template v-if="selectedTab === 'sources'">
    <!-- toggle-button | [appid field]-->
    <div class="columns">
      <div class="column is-6">
        <Field label="Steam Workshop">
          <a :class="['button','is-info',{'is-outlined': !enabledSources['steam_workshop'] }]" @click="toggleSource('steam_workshop')">
            <Icon v-if="enabledSources['steam_workshop']" icon="fa-check-circle">Enabled</Icon>
            <Icon v-else icon="fa-times">Disabled</Icon>
          </a>
        </Field>
      </div>
      <div class="column is-6">
        <Field label="App Id" info="The appid for steam workshop downloading" v-show="enabledSources['steam_workshop']">
          <input type="number" class="input" placeholder="550">
        </Field>
      </div>
    </div>
    <div class="columns">
      <div class="column is-6">
        <Field label="Direct Uploads">
          <a :class="['button','is-info',{'is-outlined': !enabledSources['direct'] }]" @click="toggleSource('direct')">
            <Icon v-if="enabledSources['direct']" icon="fa-check-circle">Enabled</Icon>
            <Icon v-else icon="fa-times">Disabled</Icon>
          </a>
        </Field>
      </div>
      <div class="column is-6">
        <Field label="Allowed File Extenstions" info="Comma,separated" v-show="enabledSources['direct']">
          <input data-type="tags" class="input" type="text" placeholder=".vpk, .smx">
        </Field>
      </div>
    </div>
</template>
<template v-if="selectedTab === 'destinations'">
  <ShareDestinationModal :share="share" @close="selectTab('general')" />
</template>
  <template v-slot:buttons>
    <button class="button is-success has-text-white" :disabled="!canSubmit">Add Share</button>
    <button class="button" @click="emit('close')">Cancel</button>
  </template>
</ModalCard>
</template>

<script setup lang="ts">
import Field from '@/components/Field.vue'
import ModalCard from '@/components/ModalCard.vue';
import ShareDestinationModal from '@/components/panel-admin/setup/ShareDestinationModal.vue'
import { computed, onMounted, ref, watch } from 'vue';
import { ShareInfo } from '../../../../../common-types/Share.js';
// @ts-expect-error
import BulmaTagsInput from '@creativebulma/bulma-tagsinput';
import { DownloadSource } from '../../../../../common-types/Share';

const emit = defineEmits(["close"])

const props = defineProps<{
  data?: ShareInfo | null
}>()

const enabledSources = computed(() => {
  if(!share.value.downloadSources) return {}
  return share.value.downloadSources
})
const TAB_IDS = {
  general: "General",
  sources: "File Sources",
  destinations: "Destinations"
}

type TABS = keyof typeof TAB_IDS
let selectedTab = ref<TABS>("general")
function selectTab(tab: TABS) {
  selectedTab.value = tab
}

const validationErrors = computed(() => {
  const errors = []
  if(!share.value.id) errors.push("An unique identifier is required")
  if(share.value.sourceFolder) errors.push("Source path is required")
  return errors
})

const canSubmit = computed(() => {
  return validationErrors.value.length === 0
})

let share = ref<ShareInfo>({
  id: '',
  sourceFolder: '',
  destinations: {},
  name: ''
})

function toggleSource(key: DownloadSource) {
  if(!share.value.downloadSources) share.value.downloadSources = {}
  share.value.downloadSources[key] = !share.value.downloadSources[key]
}

function onEnterName() {
  if(!share.value.id) {
    share.value.id = share.value.name?.toLowerCase().replace(/[^a-zA-Z0-9- ]/g, '').replace(/[\s]/g, '-')
  }
}

watch(() => props.data, () => {
  if(props.data) {
    share.value = JSON.parse(JSON.stringify(props.data))
  }
})

onMounted(() => {
  if(props.data) {
    share.value = JSON.parse(JSON.stringify(props.data))
  }
  BulmaTagsInput.attach()
})
</script>

<style>
@import 'node_modules/@creativebulma/bulma-tagsinput/dist/css/bulma-tagsinput.min.css';
</style>

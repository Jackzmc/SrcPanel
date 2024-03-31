<template>
<div class="container">
  <div class="columns">
    <div class="column is-2 has-text-right mt-6">
      <aside class="menu">
        <p class="menu-label">

        </p>
        <ul class="menu-list">
          <li @click="setDest(undefined)"><a :class="{'is-active': selectedDest == undefined}">Share</a></li>
        </ul>
        <p class="menu-label">
          Destinations
        </p>
        <ul class="menu-list">
          <li v-for="(dest, id) in share.destinations" :key="id" @click="setDest(id, dest)">
            <a :class="{'is-active': selectedDestId == id}">{{ dest.name || id }}</a>
          </li>
          <li><a class="has-text-success" @click="newDest"><Icon icon="fa-plus">New Destination</Icon></a></li>
        </ul>
      </aside>
    </div>
    <div class="column">
      <nav class="breadcrumb has-arrow-separator pl-4" aria-label="breadcrumbs">
        <ul>
          <li><a>Shares</a></li>
          <li><a href="#">{{ share.name ?? share.id }}</a></li>
          <template v-if="selectedDest">
            <li class="is-active"><a>Destinations</a></li>
            <li><a href="#" aria-current="page">{{ selectedDest?.name ?? selectedDestId }}</a></li>
          </template>
        </ul>
      </nav>
      <div class="box" v-if="selectedDest">
        <h4 class="title is-4">Destination <button class="button is-danger" @click="deleteDest"><Icon icon="fa-trash"></Icon></button></h4>
        <h5 class="subtitle is-5">{{ selectedDest.name }}</h5>
        <Field label="Id*">
          <input type="text" class="input" placeholder="Id of the share" v-model="selectedDestId" required @input="onChangeDestId">
        </Field>
        <Field label="Name">
          <input type="text" class="input" placeholder="Name of the destination" v-model="selectedDest.name">
        </Field>
        <Field label="Paths">
            <!-- <p class="control" >
            </p> -->
          <div class="columns is-multiline">
            <div class="column is-12">
              <div class="field has-addons" v-for="(path, i) in selectedDest?.paths" :key="i">
                <div class="control" style="width:100%">
                  <input v-model="selectedDest!.paths[i]" type="text" class="input" style="width:100%" placeholder="/var/share1/dest1" required>
                </div>
                <div class="control">
                  <a class="button is-danger" @click="selectedDest.paths.splice(i, 1)" v-if="selectedDest!.paths.length > 1">
                    <Icon icon="fa-trash"></Icon>
                  </a>
                </div>
              </div>
            </div>
          </div>

            <p class="control ml-2">
              <a class="button is-success" @click="selectedDest.paths.push('')">
                New Path
              </a>
            </p>
        </Field>
        <Field label="Servers">
          <Vue3TagsInput :tags="selectedDest?.serverIds" placeholder="server1" />
        </Field>
      </div>
      <div class="box" v-else>
        <h4 class="title is-4">Share</h4>
        <p class="subtitle">* marks a required field</p>
        <Field label="Name*" :info="id ? `Id: ${id}` : ''">
          <input type="text" class="input" placeholder="Name of the share" v-model="share.name" required>
        </Field>
        <Field label="Share Source Folder*" info="Where all addon files are stored">
          <input type="text" class="input" placeholder="Source Folder" v-model="share.sourceFolder" required>
        </Field>
        <Field label="Restrict to Steam Game">
          <Autocomplete input-class="input" placeholder="Enter a steam game name" :items="appids" :min-length="4" v-if="appids" v-model="share.appid" />

          <p class="help has-text-info">Restrict share for workshop addons only for this appid. Optional</p>
          <template v-if="appTitle !== null">
            <p v-if="appTitle" class="help has-text-success">App: {{appTitle}}</p>
            <p v-else class="help has-text-danger" >No steam app found</p>
          </template>
        </Field>
        <Field label="File Extensions">
          <Vue3TagsInput :tags="share.fileExts" placeholder=".vpk" @on-tags-changed="onFileExtChanged">
            <template #item="{tag}">
              .{{ tag }}
            </template>
          </Vue3TagsInput>
        </Field>
        <Field label="Download Sources" info="How files can be added. If none, will be read-only">
          <div class="field has-addons">
            <p class="control" v-for="source in DownloadSources" :key="source">
              <button :class="['button', {'has-background-info': share.downloadSources![source], 'has-text-white': share.downloadSources![source] }]" @click="toggleDownloadSource(source)">
                {{ DownloadSourceNames[source] }}
              </button>
            </p>
          </div>
        </Field>
        <br>
        <a class="button is-success">Create Share</a>
      </div>
    </div>
  </div>
</div>
</template>

<script setup lang="ts">
import Field from '@/components/Field.vue'
import { ref, computed, onBeforeMount, watch, onMounted } from 'vue';
import { ShareInfo, DownloadSource, DownloadSources, ShareDestination } from '../../../../common-types/Share';
//@ts-expect-error
import Vue3TagsInput from 'vue3-tags-input';
import Autocomplete from '../Autocomplete.vue';

const DownloadSourceNames: Record<DownloadSource, string> = {
  steam_workshop: "Steam Workshop",
  direct: "Direct",
}

let prevDestId: string
let selectedDestId = ref<string>()
let share = ref<Partial<ShareInfo>>({
  name: "New Untitled Share",
  downloadSources: {},
  destinations: {
    "testdummyremoveme": {
      name: "TEST REMOVE ME",
      paths: ["/dev/null", "/dev/null2"],
      serverIds: ["l4d2-main"]
    }
  }
})
let appids = ref<{ id: string, label: string}[]>()

let selectedDest = ref<ShareDestination>()

const id = computed(() => {
  return share.value.name?.toLocaleLowerCase().trim().replace(/\s/g, '-').replace(/^[^a-zA-Z0-9\-]/g, '') ?? ""
})

const appTitle = computed(() => {
  if(!share.value.appid || !appids.value) return null
  return appids.value[share.value.appid]
})

// We strip out any leading dot from the extension
function onFileExtChanged(tags: string[]) {
  share.value.fileExts = tags.map((ext: string) => ext.trim().replace(/^\./, ''))
}
function toggleDownloadSource(source: DownloadSource) {
  if(!share.value.downloadSources) return
  share.value.downloadSources[source] = !share.value.downloadSources[source]
}
function setDest(id?: string, dest?: any) {
  selectedDestId.value = id
  selectedDest.value = id ? dest : undefined
}
function deleteDest() {
  delete share.value.destinations![selectedDestId.value!]
  selectedDestId.value = undefined
  selectedDest.value = undefined
}
function newDest() {
  selectedDest.value = undefined
  selectedDestId.value = "untitled_dest"
  selectedDest.value = {
    paths: [],
    serverIds: [],
  }
}
function onChangeDestId() {
  if(!selectedDestId.value || !selectedDest.value) return
  delete share.value.destinations![prevDestId]
  share.value.destinations![selectedDestId.value] = selectedDest.value!
}
watch(() => selectedDestId.value, (cur, prev) => {
  if(!cur || !selectedDest || !prev) return
  prevDestId = prev
})

onMounted(async() => {
  const response = await fetch('/api/appids')
  if(response.ok) {
    const json: Record<string, string> = await response.json()
    appids.value = Object.entries(json).map(([k,v]) => { return {id: k, label: v}})
  }
})
</script>

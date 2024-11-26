<template>
<div class="box">
  <progress v-if="loadState == LoadState.Loading || loadState == LoadState.Success" :value="progress?.current" :max="progress?.total" class="progress" />
  <div class="container" v-if="loadState == LoadState.Idle">
    <h4 class="title is-3">Confirm Creation</h4>
    <p class="subtitle is-4">
      You are creating a server for the game <a :href="'https://store.steampowered.com/app/' + form.game">{{ formData.game.title }}</a>
      <span v-if="form.extraPlayers"> with 5+ support</span>
    </p>
    <h4 class="title is-4 mt-5">Server Hosting Information</h4>
    <p class="subtitle is-5">Please review the following information</p>
    <div class="notification is-warning is-light">
      The server is free of cost, but if the server remains inactive for a long duration of time, its subject to automatically be turned off.
      The settings, enabled plugins, addons, will remain intact. You can start the server back up any time through this admin panel, with the Start button.
    </div>
    <div class="notification is-warning is-light">
      The server is setup with a hard limit of 1 GB of memory, and is limited to one CPU core. It's unlikely this will ever cause problems, but if it reaches the limit the server will be restarted.
    </div>
    <div class="notification is-info is-light has-text-black">
      When you press create, it should take at most 5 minutes to provision your server. A random port will be assigned and your server connect information will be given.
      The server should automatically show up in the server panel, and you are given full permission to it. From the server management page, you can edit server config files.
    </div>
  </div>
  <div class="list has-visible-pointer-controls" v-else>

    <div class="list-item" v-for="(line, i) of lines" :key="i">
      <div class="list-item-content">
          <div class="list-item-title">
            {{ line.event }}
          </div>
          <div class="list-item-description">
            {{ line.msg }}
          </div>
      </div>

      <div class="list-item-controls">
      </div>
    </div>
    <div class="list-item" v-if="lastLine">
      <div class="list-item-content">
        <div class="list-item-title">
          {{ lastLine.event }}
        </div>
        <div class="list-item-description">
          {{ lastLine.msg }}
        </div>
      </div>
      <div class="list-item-controls">
      </div>
    </div>
  </div>
  <br>
  <div class="buttons">
    <button class="button is-info is-medium" @click="create" v-if="loadState == LoadState.Idle || loadState == LoadState.Loading" :disabled="loadState == LoadState.Loading">Create Server</button>
    <button class="button is-medium" @click="cancel" v-if="loadState == LoadState.Loading">Cancel</button>
  </div>
</div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { CustomServerForm } from '../../../../../common-types/CustomServer';
import { LoadState } from '@/types/global.js';

const emit = defineEmits(["cancel", "server", "loadState"])

const props = defineProps<{
  form: CustomServerForm,
  formData: {
    name: string,
    game: { appid: number, title: string},
    extraPlayers: boolean
  },
}>()

let lines = ref<any[]>([])
let loadState = ref<LoadState>(LoadState.Idle)

const lastLine = computed(() => {
  return lines.value.at(-1)
})

let createSource: EventSource|null = null
let progress = ref<{ current: number, total: number}>()

async function create() {
  if(loadState.value != LoadState.Idle) return
  emit("loadState", loadState.value)
  loadState.value = LoadState.Loading
  const evtSrc = new EventSource("/api/servers/custom/create", {

  })
  createSource = evtSrc
  evtSrc.onmessage = (e) => {
    const payload = JSON.parse(e.data.toString())
    if(payload.progress) {
      progress.value = payload.progress
    }
    if(payload.server) {
      console.log('server', payload.server)
      evtSrc.close()
      emit("server", payload.server)
      lines.value.unshift({ event: "DONE"})
      loadState.value = LoadState.Success
      return
    }
    console.log(payload)
    lines.value.unshift(payload)
  }
  evtSrc.onopen = (e) => {

  }
  evtSrc.onerror = (e) => {
    loadState.value = LoadState.Error
    evtSrc.close()
  }
}

function cancel() {
  loadState.value = LoadState.Cancelled
  createSource?.close()
}
</script>

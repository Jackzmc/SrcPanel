<template>
<div class="box">
  <progress v-if="loadState == LoadState.Loading || loadState == LoadState.Success" :value="progress?.current" :max="progress?.total" class="progress" />
  <div class="list has-visible-pointer-controls" >
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

const emit = defineEmits(["cancel", "server"])

const props = defineProps<{
  form: CustomServerForm
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

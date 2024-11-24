<template>
<div class="box">
  <div class="list has-visible-pointer-controls" >
    <div class="list-item" v-for="(line, i) of lines" :key="i">
      <div class="list-item-content">
          <div class="list-item-title">
            {{ line.event }}
          </div>
          <div class="list-item-description">
            <slot name="description">
              {{ line.msg }}
            </slot>
          </div>
      </div>

      <div class="list-item-controls">
      </div>
    </div>
    <button class="button is-info is-large" @click="create">Create</button>
  </div>
</div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { CustomServerForm } from '../../../../../common-types/CustomServer';
const props = defineProps<{
  form: CustomServerForm
}>()

let lines = ref<any[]>([])

async function create() {
  const evtSrc = new EventSource("/api/servers/custom/create")
  evtSrc.onmessage = (e) => {
    const payload = JSON.parse(e.data.toString())
    console.log(payload)
    lines.value.push(payload)
  }
  evtSrc.onopen = (e) => {

  }
  evtSrc.onerror = (e) => {

  }
}
</script>

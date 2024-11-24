<template>
<div class="box">
  <span v-for="(line, i) in lines" :key="i">
    {{ line }}
  </span>
  <button class="button is-info is-large" @click="create">Create</button>
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

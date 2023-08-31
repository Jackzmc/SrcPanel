<template>
<JsonEditorVue v-model="json" boxed>

</JsonEditorVue>
</template>

<script setup lang="ts">
import JsonEditorVue from 'json-editor-vue'
import { ref, onBeforeMount } from 'vue'
import { request } from '@/js/util'

const props = defineProps<{
  filename: string
}>()

let json = ref<string>()

async function fetchFile() {
  const response = await request(`/api/panel/config/${props.filename}`)
  if(response?.ok) {
    json.value = await response.json()
  }
}

onBeforeMount(() => {
  fetchFile()
})
</script>

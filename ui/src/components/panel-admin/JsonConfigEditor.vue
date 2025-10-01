<template>
<div>
  <JsonEditorVue v-if="json" v-model="json" boxed @change="hasChanges = true" />
  <p v-else class="has-text-centered py-5">Loading...</p>
  <div class="mt-2 buttons">
    <a :class="['button','is-success',saveTooltipClass]" :disabled="hasChanges?undefined:true" :data-tooltip="canSaveTooltip" @click="save">Save Changes</a>
    <a class="button is-danger has-tooltip-danger" :disabled="(json && hasChanges) ? undefined : true" data-tooltip="Reset all changes" @click="reset">Reset</a>
  </div>
</div>
</template>

<script setup lang="ts">
import JsonEditorVue from 'json-editor-vue'
import { ref, onBeforeMount, computed, watch, onMounted } from 'vue';
import { request } from '@/js/util'
import { notify } from '@kyvg/vue3-notification'

const props = defineProps<{
  filename: string
}>()

let hasChanges = ref()

let json = ref<string>()

const canSaveTooltip = computed(() => {
  return hasChanges.value ? 'Save your changes' : 'No changes to save'
})
const saveTooltipClass = computed(() => {
  return hasChanges.value ? "has-tooltip-info" : "has-tooltip-danger"
})

async function save() {
  const response = await request(`/api/panel/config/${props.filename}`, {
    method: "POST",
    headers: {'Content-Type': 'application/json' },
    body: JSON.stringify(json.value)
  })
  if(response?.ok) {
    hasChanges.value = false
    notify({
      type: "success",
      text: `Changes to ${props.filename} have been saved.`
    })
  }
}

async function reset() {
  if(!hasChanges.value) return
  if(confirm("Are you sure you want to reset your changes?")) {
    json.value = undefined
    await fetchFile()
  }
}

async function fetchFile() {
  const response = await request(`/api/panel/config/${props.filename}`)
  if(response?.ok) {
    json.value = await response.json()
  }
}

onMounted(() => {
  fetchFile()
})
</script>

<template>
<Modal active closable>
  <div class="modal-card">
    <header class="modal-card-head">
      <p class="modal-card-title">Upload Addon
        <span class="tag is-info has-tooltip-bottom is-pulled-right mr-2 is-rounded" data-tooltip="The target share">{{props.share.id}}</span>
      </p>
      <button class="delete" aria-label="close" @click='close'></button>
    </header>
    <section class="modal-card-body">
      <div class="file has-name is-boxed">
        <label class="file-label">
          <input class="file-input" type="file" ref="filePicker" @change="onFileUploaded" :accept="validFiles">
          <span class="file-cta">
            <span class="file-label">
              Choose an addon
            </span>
          </span>
          <span class="file-name" v-if="file">
            {{ file.name }}
          </span>
        </label>
      </div>
    </section>
    <footer class="modal-card-foot">
      <template v-if="uploadState > 1">
        <button  @click="restartServers" :class="['button','is-info', {'is-loading': uploadState === 3}]">
          Restart Servers
        </button>
      </template>
      <template v-else>
        <button :class="['button','is-info', {'is-loading': uploadState == 1}]"
          :disabled="!file || installDestinations.length == 0"
          @click="startUpload()"
        >
          Upload
        </button>
        <button class="button" @click="close">
          Cancel
        </button>
      </template>
    </footer>
  </div>
</Modal>
</template>

<script setup lang="ts">
// TODO: Resolve workshop id, show appid and title of item
import Modal from '@/components/Modal.vue'
import { computed, ref, onBeforeMount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useNotification } from "@kyvg/vue3-notification";
import { fi } from 'date-fns/locale';

const { notify }  = useNotification()

const validFiles = computed(() => {
  return '.' + props.share.validExts.join(",.")
})

const emit = defineEmits(['close'])
const props = defineProps<{
  share: any
}>()
let installDestinations = ref<string[]>([])
let uploadState = ref(0)
let filePicker = ref()
const file = computed(() => {
  if(!filePicker.value) return
  return filePicker.value.files[0]
})

// TODO: use router-view for /admin/addons/add
const route = useRoute()
const router = useRouter()

function onFileUploaded() {
  console.log(filePicker.value.files)
}

async function restartServers() {
  let count = {
    total: 0,
    success: 0,
    rejected: 0
  }
  for(const destId of installDestinations.value) {
    const destInfo = props.share.destinations.find((dest: any) => dest.id == destId)
    if(destInfo.serverIds) {
      const promises = destInfo.serverIds.map((serverId: string) => restartServer(serverId))
      const results = await Promise.allSettled(promises)
      const rejectedCount = results.reduce((pv, result) => {
        if(result.status === "rejected") ++pv
        return pv
      }, 0)
      if(rejectedCount > 0) {
        console.error(`${destInfo.id}: ${rejectedCount} / ${promises.length} servers failed to restart`)
      }
      count.total += promises.length
      count.success += promises.length - rejectedCount
      count.rejected += rejectedCount
    }
  }

  let msg = `${count.success} / ${count.total} servers restarted`
  if(count.rejected > 0) msg += "<br>See the console for more information"

  notify({
    type: count.rejected > 0 ? "error" : "success",
    title: "Server Restarted",
    text: msg,
  })
  close()

}

async function restartServer(id: string) {
  const response = await fetch(`/api/servers/${id}/restart`, {
    method: 'POST'
  })
  if(response.ok) return true
  throw new Error(`Server returned ${response.status} ${response.statusText} for ${id}`)
}

function startUpload() {
}

function close() {
  emit('close', true)
}

onBeforeMount(() => {
  if(route.query.dests) {
    const dests = route.query.dests.toString().split(",")
    installDestinations.value = dests
  }
})
</script>

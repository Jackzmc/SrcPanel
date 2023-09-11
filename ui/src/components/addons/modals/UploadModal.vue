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
            <span class="file-icon">
              <Icon icon="fas fa-upload" />
            </span>
            <span class="file-label">
              Choose an addon
            </span>
          </span>
          <span class="file-name" v-if="filename">
            {{ filename }}
          </span>
        </label>
      </div>
      <br>
      <div class="field" v-if="filename">
        <label class="label">Install Destinations</label>
        <div class="field" v-for="(dest, id) in props.share.destinations" :key="id">
          <input
            :id="id"
            type="checkbox"
            :value="id"
            class="is-checkradio has-tooltip-right"
            v-model="installDestinations"
          >
          <label :for="id">
            <span v-if="dest.name"><b>{{dest.name}}</b> (<em>{{id}}</em>)</span>
            <span v-else>{{id}}</span>
            &nbsp;<span class="tag is-info has-tooltip-right is-small is-rounded" data-tooltip="Number of servers that share this destination">{{dest.serverIds?.length ?? 0}} Servers</span>
          </label>
        </div>
      </div>
      <p>Note: Max file size is limited to 5 GB.</p>
    </section>
    <footer class="modal-card-foot">
      <template v-if="uploadState > 1">
        <button  @click="restartServers" :class="['button','is-info', {'is-loading': uploadState === 3}]">
          Restart Servers
        </button>
      </template>
      <template v-else>
        <button :class="['button','is-info', {'is-loading': uploadState == 1}]"
          :disabled="!filename || installDestinations.length == 0"
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
import { request, restartServer } from '@/js/util';
import { ShareInfo } from '../../../../../common-types/Share';

const { notify }  = useNotification()

const validFiles = computed(() => {
  if(!props.share.fileExts) return ""
  return '.' + props.share.fileExts.join(",.")
})

const emit = defineEmits(['close'])
const props = defineProps<{
  share: ShareInfo
}>()
let installDestinations = ref<string[]>([])
let uploadState = ref(0)
let filePicker = ref<HTMLInputElement>()
let filename = ref()
let uploadProgress = ref({ total: 0, current: 0})

// TODO: use router-view for /admin/addons/add
const route = useRoute()
const router = useRouter()

function onFileUploaded() {
  filename.value = filePicker.value!.files![0].name
  console.log(filePicker.value!.files)
}

async function restartServers() {
  let count = {
    total: 0,
    success: 0,
    rejected: 0
  }
  for(const destId of installDestinations.value) {
    const destInfo = props.share.destinations[destId]
    if(destInfo.serverIds) {
      const promises = destInfo.serverIds.map((serverId: string) => restartServer(serverId))
      const results = await Promise.allSettled(promises)
      const rejectedCount = results.reduce((pv, result) => {
        if(result.status === "rejected") ++pv
        return pv
      }, 0)
      if(rejectedCount > 0) {
        console.error(`${destId}: ${rejectedCount} / ${promises.length} servers failed to restart`)
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

async function startUpload() {
  if(!filePicker.value || !filePicker.value.files) return
  uploadState.value = 1
  const formData = new FormData()
  formData.append("files[]", filePicker.value.files[0])
  uploadProgress.value = {
    current: 0,
    total: filePicker.value.files[0].size
  }
  const response = await fetch(`/api/shares/${props.share.id}/addons/upload`, {
    method: 'POST',
    body: formData
  })

  // for await (const chunk of response?.body) {
  //   uploadProgress.value += chunk.length;
  // }
  if(response?.ok) {
    uploadState.value = 2
    notify({
      type: "success",
      text: `Uploaded \"${filename.value}\"`
    })
  } else {
    uploadState.value = 0
  }
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

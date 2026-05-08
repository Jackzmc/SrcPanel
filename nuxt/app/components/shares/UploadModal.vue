<template>
  <UModal open title="Upload File" @update:open="$emit('close')">
    <template #body>
      <div class="p-4">
        <UFileUpload
          v-model="selected"
          layout="list"
          label="Drop files here"
          :description="'Accepts ' + accepts"
          interactive dropzone
          class="w-96 min-h-48"
          :accept="accepts"
        />
        <br />
        <div v-if="selected">
          <UButton
            label="Upload"
            size="lg"
            @click="uploadFile"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type { ShareInfo } from '@jzpanel/common/Share';

const toast = useToast()

const props = defineProps<{
  share: ShareInfo
}>()

const accepts = computed(() => {
  if(!props.share.fileExts) return undefined // any file
  return props.share.fileExts.map(ext => `.${ext}`).join(',');
})

const selected = ref<File|undefined>()

async function uploadFile() {
  const response = await request<{}>(`/api/shares/${props.share.id}/addons/upload`, {
    method: 'POST',
    body: selected.value
  });
  if('body' in response) {
    toast.add({
      title: `Upload successful`,
      color: 'success',
      description: `${selected.value?.name} was uploaded successfully`,
      icon: "lucide:upload"
    })
  } else {
    toast.add({
      title: `Upload failed`,
      color: 'error',
      description: `${selected.value?.name} failed: ${response.error}`,
      icon: "lucide:upload"
    })
  }

  selected.value = undefined
}
</script>
